const deps = require("./deps");

module.exports = async ({ payload, context, aggregateFn }) => {
  const root = context.challenge.root;

  // Look for the challenge being answered.
  const { aggregate: challengeAggregate } = await aggregateFn(root);

  // Throw if the code is wrong.
  if (challengeAggregate.code != payload.code)
    throw deps.invalidArgumentError.message("This code is wrong.", {
      info: { reason: "wrong" },
    });

  // Throw if the challenge is expired.
  const now = new Date();

  // Throw if the code is expired.
  if (Date.parse(challengeAggregate.expires) < now)
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
      correctNumber: 1,
    },
    ...(challengeAggregate.events || []),
  ];

  // If there isn't a need to upgrade the context, no need to return a token.
  if (!challengeAggregate.upgrade) return { events };

  // Upgrade the session with the principle specified in the challenge.
  const {
    body: { tokens, context: newContext },
  } = await deps
    .command({
      domain: "session",
      name: "upgrade",
    })
    .set({
      context,
      claims: challengeAggregate.claims,
      tokenFns: { internal: deps.gcpToken },
    })
    .issue(challengeAggregate.upgrade, { root: context.session.root });

  return { events, response: { tokens, context: newContext } };
};
