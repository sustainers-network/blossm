import deps from "./deps.js";

export default async ({
  payload,
  context,
  aggregateFn,
  commandFn,
  logEventsFn,
  generateRootFn,
}) => {
  const root = context.challenge.root;
  const challengeAggregate = await aggregateFn(root);

  if (challengeAggregate.state.answered)
    throw deps.invalidArgumentError.message(
      "This code has already been used.",
      {
        info: { reason: "answered" },
      }
    );

  if (!(await deps.compare(payload.code, challengeAggregate.state.code)))
    throw deps.invalidArgumentError.message("This code is wrong.", {
      info: { reason: "wrong" },
    });

  if (!(Date.parse(challengeAggregate.state.expires) > Date.now()))
    throw deps.invalidArgumentError.message("This code expired.", {
      info: { reason: "expired" },
    });

  const response = {};
  const tokens = [];
  const upgrade = challengeAggregate.state.upgrade;

  return {
    events: [
      {
        root,
        action: "answer",
        correctNumber: challengeAggregate.lastEventNumber + 1,
        payload: {
          answered: deps.stringDate(),
          // Distinct attempts must reach the event-number check even when the
          // caller reuses an idempotency key at the same timestamp.
          answerId: generateRootFn(),
        },
      },
    ],
    revoke: [
      { type: "challenge", network: context.network || process.env.NETWORK },
    ],
    ...(upgrade && { response, tokens }),
    // The runtime invokes this only after the numbered answer commits.
    thenFn: async () => {
      // Unnumbered events await queue acceptance, not persistence. A later
      // failure leaves the challenge consumed; it cannot replay this work.
      if (challengeAggregate.state.events?.length)
        await logEventsFn(challengeAggregate.state.events);

      if (!upgrade) return;

      const {
        body: { _tokens, context: newContext },
      } = await commandFn({
        domain: "session",
        name: "upgrade",
        claims: challengeAggregate.state.claims,
        payload: upgrade,
      });

      response.context = newContext;
      tokens.push(..._tokens);
    },
  };
};
