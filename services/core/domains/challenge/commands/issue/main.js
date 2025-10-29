import {
  MILLISECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
} from "@blossm/duration-consts";

import deps from "./deps.js";

const ONE_HOUR = MILLISECONDS_IN_HOUR;
const THREE_MINUTES = 3 * SECONDS_IN_MINUTE;
const CODE_LENGTH = 6;

const determineUpgrade = async (payload, context, queryAggregatesFn) => {
  
  // Get the hmac encrypted email.
  const hmacEmail = await deps.hmacCreate({
    secret: await deps.secret("email-hmac-key"),
    message: payload.email
  })

  // Check to see if the email is recognized.
  // If the principal is being upgraded, use a placeholder account with it instead.
  const [account] = await queryAggregatesFn({
    domain: "account",
    queryPairs: [{
      key: "emailHmac",
      value: hmacEmail,
    }],
  });

  if (!account)
    throw deps.invalidArgumentError.message("This email isn't recognized.", {
      info: { email: payload.email },
    });
  
  // If the account has a password, make sure the matches the password passed in the payload.
  if (account.state.password && !(await deps.compare(payload.password, account.state.password)))
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
    // If the context already has a principal, no need to add it again.
    ...(!context.principal && { principal: account.state.principal }),
  };
};

export default async ({
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

  // If a context upgrade object isn't provided, determine what it should be.
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
  const [hashedCode] = await Promise.all([
    deps.hash(code.toString()),
    commandFn({
      name: "send-auth-code",
      domain: "email",
      service: "comms",
      payload: {
        from: "authenticator",
        to: payload.email,
        subject: "Auth code",
        message: `${code} is your verification code.`,
      },
      async: true,
    })
  ]);

  return {
    events: [
      // Issue the challenge.
      {
        action: "issue",
        payload: {
          code: hashedCode,
          ...(upgrade && { upgrade }),
          ...(claims && { claims }),
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
