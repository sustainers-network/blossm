import {
  MILLISECONDS_IN_HOUR,
  SECONDS_IN_MINUTE,
} from "@blossm/duration-consts";

import { isIPv6 } from "node:net";

import deps from "./deps.js";

const ONE_HOUR = MILLISECONDS_IN_HOUR;
const THREE_MINUTES = 3 * SECONDS_IN_MINUTE;
const CODE_LENGTH = 6;
// Challenges one caller can request for one email within the window.
const MAX_REQUESTS = 5;
// Challenges one email can be sent within the window, whoever asks. No more
// than the request times the store keeps, see the event store's handlers.
const MAX_EMAIL_REQUESTS = 20;
const REQUEST_WINDOW = 15 * SECONDS_IN_MINUTE * 1000;

// The part of an address that says who is calling. A host on IPv6 is usually
// handed a whole /64, so it has no end of addresses: its first four groups are
// what stay the same.
const caller = (ip) => {
  const address = String(ip).toLowerCase();
  if (!isIPv6(address) || address.includes(".")) return address;
  const [head, tail] = address.split("::");
  const before = head ? head.split(":") : [];
  const after = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? before
      : [...before, ...Array(8 - before.length - after.length).fill("0"), ...after];
  return groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":");
};

// Counts this request, and refuses it if a limit is reached.
//
// The tight limit is on the caller together with the email, so one caller
// can't use up an email's allowance and lock its owner out. The email alone
// has a looser limit that bounds codes sent and passwords tried from many
// callers at once. A request with no address, which only a caller inside the
// network can make, is held to the tight limit on the email.
//
// Each count is an aggregate of its own in the challenge store. Every limit is
// checked before anything is written, and the counts are then written
// together, numbered, before anything else happens. So a refused request
// counts nowhere, and requests sent at once compete for one slot: the rest
// fail without a code being sent or a password being checked.
const countRequest = async ({
  hmacEmail,
  ip,
  aggregateFn,
  logEventsFn,
  generateRootFn,
}) => {
  const hex = (value) => Buffer.from(String(value)).toString("hex");
  const email = `email-${hex(hmacEmail)}`;
  const counts = [
    ...(ip
      ? [{ root: `${email}-from-${hex(caller(ip))}`, max: MAX_REQUESTS }]
      : []),
    { root: email, max: ip ? MAX_EMAIL_REQUESTS : MAX_REQUESTS },
  ];

  const aggregates = await Promise.all(
    counts.map(({ root }) => aggregateFn(root, { notFoundThrows: false }))
  );

  for (const [index, { max }] of counts.entries()) {
    const aggregate = aggregates[index];
    const recent = ((aggregate && aggregate.state.requests) || []).filter(
      (requested) =>
        Date.now() - new Date(requested).getTime() < REQUEST_WINDOW
    );
    if (recent.length >= max)
      throw deps.invalidArgumentError.message(
        "Too many codes have been requested. Try again in a few minutes.",
        {
          info: { reason: "requests" },
        }
      );
  }

  await logEventsFn(
    counts.map(({ root }, index) => ({
      root,
      action: "request",
      correctNumber: aggregates[index]
        ? aggregates[index].lastEventNumber + 1
        : 0,
      // The id keeps a repeated idempotency key from making two requests look
      // like one event, which the store would drop without counting.
      payload: { requested: deps.stringDate(), requestId: generateRootFn() },
    }))
  );
};

const determineUpgrade = (account, payload, context) => {
  // Make sure the email is recognized.
  if (!account)
    throw deps.invalidArgumentError.message("This email isn't recognized.", {
      info: { email: payload.email },
    });

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
  // The caller's address, when the request came through a gateway.
  ip,
  // `events` are any events to submit once the challenge is answered.
  // `upgrade` is an object of properties to add to the context of the
  // access token returned by answering this issued challenge.
  options: { events, upgrade } = {},
  commandFn,
  aggregateFn,
  logEventsFn,
  queryAggregatesFn,
  generateRootFn,
}) => {
  // Get the hmac encrypted email.
  const hmacEmail = await deps.hmacCreate({
    secret: await deps.secret("email-hmac-key"),
    message: payload.email,
  });

  await countRequest({
    hmacEmail,
    ip,
    aggregateFn,
    logEventsFn,
    generateRootFn,
  });

  // Check to see if there is an account with the provided email.
  const [account] = await queryAggregatesFn({
    domain: "account",
    queryPairs: [
      {
        key: "emailHmac",
        value: hmacEmail,
      },
    ],
  });

  // If the account has a password, make sure it matches the password passed in
  // the payload. This is the one place an account's password is checked, so
  // every check is counted above, whoever supplies the upgrade.
  if (
    account &&
    account.state.password &&
    !(await deps.compare(payload.password, account.state.password))
  )
    throw deps.badRequestError.message("This password is incorrect.");

  // If a context upgrade object isn't provided, determine what it should be.
  upgrade = upgrade || determineUpgrade(account, payload, context);

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
