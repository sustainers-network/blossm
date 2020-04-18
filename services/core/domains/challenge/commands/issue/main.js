const {
  MILLISECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
} = require("@blossm/duration-consts");

const deps = require("./deps");

const ONE_HOUR = MILLISECONDS_IN_HOUR;
const THREE_MINUTES = 3 * SECONDS_IN_MINUTE;

const CODE_LENGTH = 6;

let sms;

const determineUpgrade = async (payload, context) => {
  // Check to see if the phone is recognized.
  // If the principle is being upgraded, use a placeholder identity with it instead.
  const [identity] = await deps
    .eventStore({ domain: "identity" })
    .set({ context, tokenFns: { internal: deps.gcpToken } })
    .query({ key: "id", value: payload.id });

  if (!identity)
    throw deps.invalidArgumentError.message("This id isn't recognized.", {
      info: { id: payload.id },
    });

  if (!(await deps.compare(payload.phone, identity.state.phone)))
    throw deps.badRequestError.message(
      "This phone number can't be used to challenge."
    );

  // If the context already has a principle, don't allow another principle to be challenged.
  if (
    context.principle &&
    context.principle.root != identity.state.principle.root
  )
    throw deps.badRequestError.message(
      "This principle can't be challenged during the current session."
    );

  // No need to upgrade if the context already has an identity.
  if (context.identity) return null;

  return {
    identity: {
      root: identity.headers.root,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
    },
    ...(!context.principle && { principle: identity.state.principle }),
  };
};

module.exports = async ({
  payload,
  context,
  claims,
  // `events` are any events to submit once the challenge is answered.
  // `upgrade` is an object of properties to add to the context of the
  // access token returned by answering this issued challenge.
  options: { events, upgrade } = {},
}) => {
  // Lazily load up the sms connection.
  if (!sms) {
    sms = deps.sms(
      await deps.secret("twilio-account-sid"),
      await deps.secret("twilio-auth-token")
    );
  }

  upgrade = upgrade || (await determineUpgrade(payload, context));

  // Create the root for this challenge.
  const root = deps.uuid();

  // Create a token that can only access the answer challenge command.
  const token = await deps.createJwt({
    options: {
      issuer: `${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.NETWORK}/issue`,
      audience: process.env.NETWORK,
      expiresIn: ONE_HOUR,
    },
    payload: {
      context: {
        ...context,
        // Add a reference to the challenge to the context.
        challenge: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    signFn: deps.sign({
      ring: "jwt",
      key: "challenge",
      location: "global",
      version: "1",
      project: process.env.GCP_PROJECT,
    }),
  });

  // Create a challenge code.
  const code = deps.randomIntOfLength(CODE_LENGTH);

  // Send the code.
  await sms.send({
    to: payload.phone,
    from: process.env.TWILIO_SENDING_PHONE_NUMBER,
    body: `${code} is your verification code. Enter it in the app to let us know it's really you.`,
  });

  // Send the token to the requester so they can access the answer command.
  return {
    events: [
      {
        action: "issue",
        payload: {
          code,
          ...(upgrade && { upgrade }),
          claims,
          issued: deps.stringDate(),
          expires: deps.moment().add(THREE_MINUTES, "s").toDate().toISOString(),
          ...(events && { events }),
        },
        correctNumber: 0,
        root,
      },
    ],
    response: {
      tokens: [
        { network: process.env.NETWORK, type: "challenge", value: token },
      ],
      references: {
        challenge: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
