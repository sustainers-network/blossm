const deps = require("./deps");

module.exports = async ({ payload, context, aggregateFn, commandFn }) => {
  const root = context.challenge.root;

  // Look for the challenge being answered.
  const challengeAggregate = await aggregateFn(root);

  // Throw if the code is wrong.
  if (challengeAggregate.state.code != payload.code)
    throw deps.invalidArgumentError.message("This code is wrong.", {
      info: { reason: "wrong" },
    });

  // Throw if the challenge is expired.
  const now = new Date();

  // Throw if the code is expired.
  if (Date.parse(challengeAggregate.state.expires) < now)
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
    ...(challengeAggregate.state.events || []),
  ];

  // If there isn't a need to upgrade the context, no need to return a token.
  if (!challengeAggregate.state.upgrade) return { events };

  // Upgrade the session with the principal specified in the challenge.
  const {
    body: { tokens, context: newContext },
  } = await commandFn({
    domain: "session",
    name: "upgrade",
    claims: challengeAggregate.state.claims,
    payload: challengeAggregate.state.upgrade,
  });

  return { events, response: { tokens, context: newContext } };
};
