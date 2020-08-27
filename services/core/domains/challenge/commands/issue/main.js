const {
  MILLISECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
} = require("@blossm/duration-consts");

const deps = require("./deps");

const ONE_HOUR = MILLISECONDS_IN_HOUR;
const THREE_MINUTES = 3 * SECONDS_IN_MINUTE;

const CODE_LENGTH = 6;

const determineUpgrade = async (payload, context, queryAggregatesFn) => {
  // Check to see if the phone is recognized.
  // If the principal is being upgraded, use a placeholder identity with it instead.
  const [identity] = await queryAggregatesFn({
    domain: "identity",
    key: "id",
    value: payload.id,
  });

  if (!identity)
    throw deps.invalidArgumentError.message("This id isn't recognized.", {
      info: { id: payload.id },
    });

  if (!(await deps.compare(payload.phone, identity.state.phone)))
    throw deps.badRequestError.message(
      "This phone number can't be used to challenge."
    );

  // If the context already has a principal, don't allow another principal to be challenged.
  if (
    context.principal &&
    context.principal.root != identity.state.principal.root
  )
    throw deps.badRequestError.message(
      "This principal can't be challenged during the current session."
    );

  // No need to upgrade if the context already has an identity.
  if (context.identity) return null;

  return {
    identity: {
      root: identity.root,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
    },
    ...(!context.principal && { principal: identity.state.principal }),
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
  commandFn,
  queryAggregatesFn,
}) => {
  upgrade =
    upgrade || (await determineUpgrade(payload, context, queryAggregatesFn));

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
    signFn: (message) =>
      deps.sign({
        message,
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
  await commandFn({
    name: "send",
    domain: "sms",
    service: "comms",
    payload: {
      to: payload.phone,
      message: `${code} is your verification code.`,
    },
    async: true,
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
        {
          network: context.network || process.env.NETWORK,
          type: "challenge",
          value: token,
        },
      ],
      receipt: {
        challenge: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
