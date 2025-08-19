import deps from "./deps.js";

export default async ({ payload, context, aggregateFn, commandFn }) => {

  // Get the root from the challenge context..
  const root = context.challenge.root;

  // Look for the challenge being answered.
  const challengeAggregate = await aggregateFn(root);

  // Make sure the code is correct.
  if (await deps.compare(challengeAggregate.state.code, payload.code))
    throw deps.invalidArgumentError.message("This code is wrong.", {
      info: { reason: "wrong" },
    });

  // Make sure the challenge isn't expired.
  if (Date.parse(challengeAggregate.state.expires) < new Date())
    throw deps.invalidArgumentError.message("This code expired.", {
      info: { reason: "expired" },
    });

  const events = [
    {
      root,
      action: "answer",
      payload: {
        answered: deps.stringDate(),
      },
    },
    // Add the events that are queued in the challenge.
    ...(challengeAggregate.state.events || []),
  ];
  
  // Revoke the challenge token.
  const revoke = [
    { type: "challenge", network: context.network || process.env.NETWORK },
  ];

  // If there isn't a need to upgrade the context, no need to return a token.
  if (!challengeAggregate.state.upgrade) return { events, revoke };

  // Upgrade the session with the upgrade specified in the challenge.
  const {
    body: { _tokens, context: newContext },
  } = await commandFn({
    domain: "session",
    name: "upgrade",
    claims: challengeAggregate.state.claims,
    payload: challengeAggregate.state.upgrade,
  });

  return {
    events,
    response: { context: newContext },
    tokens: _tokens,
    revoke,
  };
};
