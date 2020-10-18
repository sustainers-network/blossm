const {
  MILLISECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
} = require("@blossm/duration-consts");

const deps = require("./deps");

const ONE_HOUR = MILLISECONDS_IN_HOUR;
const THREE_MINUTES = 3 * SECONDS_IN_MINUTE;
const CODE_LENGTH = 6;

const determineUpgrade = async (payload, context, queryAggregatesFn) => {
  // Check to see if the email is recognized.
  // If the principal is being upgraded, use a placeholder account with it instead.
  const [account] = await queryAggregatesFn({
    domain: "account",
    key: "email",
    value: payload.email,
  });

  if (!account)
    throw deps.invalidArgumentError.message("This email isn't recognized.", {
      info: { email: payload.email },
    });

  if (!(await deps.compare(payload.password, account.state.password)))
    throw deps.badRequestError.message("This password is incorrect.");

  // If the context already has a principal, don't allow another principal to be challenged.
  if (
    context.principal &&
    context.principal.root != account.state.principal.root
  )
    throw deps.badRequestError.message(
      "This principal can't be challenged during the current session."
    );

  // No need to upgrade if the context already has an account.
  if (context.account) return null;

  return {
    account: {
      root: account.root,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
    },
    ...(!context.principal && { principal: account.state.principal }),
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
  generateRootFn,
}) => {
  upgrade =
    upgrade || (await determineUpgrade(payload, context, queryAggregatesFn));

  // Create the root for this challenge.
  const root = generateRootFn();

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
        // Add a reference to this challenge to the context.
        challenge: {
          method: "email",
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    signFn: (message) =>
      // Sign the token with the challenge key.
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
    domain: "email",
    service: "comms",
    payload: {
      from: "Authenticator",
      to: payload.email,
      subject: "Auth code",
      message: `${code} is your verification code.`,
    },
    async: true,
  });

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
      // Send the info so the issuer knows where to look for the challenge.
      receipt: {
        challenge: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    // Send the token to the requester so they can access the answer command.
    tokens: [
      {
        network: context.network || process.env.NETWORK,
        type: "challenge",
        value: token,
      },
    ],
  };
};
