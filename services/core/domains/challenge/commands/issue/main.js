const {
  MILLISECONDS_IN_HOUR,
  SECONDS_IN_MINUTE
} = require("@blossm/duration-consts");

const deps = require("./deps");

const ONE_HOUR = MILLISECONDS_IN_HOUR;
const THREE_MINUTES = 3 * SECONDS_IN_MINUTE;

const CODE_LENGTH = 6;

let sms;

module.exports = async ({
  payload,
  context,
  claims,
  // `events` are any events to submit once the challenge is answered.
  // `principle` is the principle to set as the subject of the session token.
  options: { events, principle } = {}
}) => {
  // Lazily load up the sms connection.
  if (!sms) {
    sms = deps.sms(
      await deps.secret("twilio-account-sid"),
      await deps.secret("twilio-auth-token")
    );
  }

  // Check to see if the phone is recognized.
  // If identity and principle roots are passed in, use theme as the identity instead.
  const [identity] = principle
    ? [{ state: { principle } }]
    : await deps
        .eventStore({ domain: "identity" })
        .set({ context, tokenFns: { internal: deps.gcpToken } })
        .query({ key: "id", value: payload.id });

  if (!identity)
    throw deps.invalidArgumentError.phoneNotRecognized({
      info: { id: payload.id }
    });

  if (!principle && !(await deps.compare(payload.phone, identity.state.phone)))
    throw deps.badRequestError.message(
      "This phone number can't be used to challenge."
    );

  if (claims.sub && claims.sub != identity.state.principle.root)
    throw deps.badRequestError.message(
      "This principle can't be challenged during the current session."
    );

  // Create the root for this challenge.
  const root = deps.uuid();

  // Create a token that can only access the answer challenge command.
  const token = await deps.createJwt({
    options: {
      issuer: `${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.NETWORK}/issue`,
      audience: `${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.NETWORK}/answer`,
      expiresIn: ONE_HOUR
    },
    payload: {
      context: {
        ...context,
        challenge: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK
        }
      }
    },
    signFn: deps.sign({
      ring: "jwt",
      key: "challenge",
      location: "global",
      version: "1",
      project: process.env.GCP_PROJECT
    })
  });

  // Create a challenge code.
  const code = deps.randomIntOfLength(CODE_LENGTH);

  // Send the code.
  sms.send({
    to: payload.phone,
    from: process.env.TWILIO_SENDING_PHONE_NUMBER,
    body: `${code} is your verification code. Enter it in the app to let us know it's really you.`
  });

  // Send the token to the requester so they can access the answer command.
  return {
    events: [
      {
        action: "issue",
        payload: {
          code,
          principle: identity.state.principle,
          claims,
          issued: deps.stringDate(),
          expires: deps
            .moment()
            .add(THREE_MINUTES, "s")
            .toDate()
            .toISOString(),
          ...(events && { events })
        },
        correctNumber: 0,
        root
      }
    ],
    response: {
      tokens: [
        { network: process.env.NETWORK, type: "challenge", value: token }
      ]
    }
  };
};
