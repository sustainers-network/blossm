import deps from "./deps.js";

export default async ({
  payload,
  context,
  aggregateFn,
  commandFn,
  logEventsFn,
  generateRootFn,
}) => {
  // Get the root from the challenge context.
  const root = context.challenge.root;

  // Look for the challenge being answered.
  const challengeAggregate = await aggregateFn(root);

  // Make sure the challenge hasn't already been answered.
  if (challengeAggregate.state.answered)
    throw deps.invalidArgumentError.message(
      "This code has already been used.",
      {
        info: { reason: "answered" },
      }
    );

  // Make sure the code is correct.
  if (!(await deps.compare(payload.code, challengeAggregate.state.code)))
    throw deps.invalidArgumentError.message("This code is wrong.", {
      info: { reason: "wrong" },
    });

  // Make sure the challenge isn't expired.
  const expiresAt = Date.parse(challengeAggregate.state.expires);
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now())
    throw deps.invalidArgumentError.message("This code expired.", {
      info: { reason: "expired" },
    });

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
    // Revoke the challenge token.
    revoke: [
      { type: "challenge", network: context.network || process.env.NETWORK },
    ],
    // The runtime invokes this only after the numbered answer commits.
    thenFn: async () => {
      // Unnumbered events await queue acceptance, not persistence. A later
      // failure leaves the challenge consumed; it cannot replay this work.
      // Dispatch the events queued in the challenge.
      if (challengeAggregate.state.events?.length)
        await logEventsFn(challengeAggregate.state.events);

      // If there isn't a need to upgrade the context, no need to return a token.
      if (!upgrade) return;

      // Upgrade the session with the upgrade specified in the challenge.
      const {
        body: { _tokens, context: newContext },
      } = await commandFn({
        domain: "session",
        name: "upgrade",
        claims: challengeAggregate.state.claims,
        payload: upgrade,
      });

      return {
        response: { context: newContext },
        tokens: _tokens,
      };
    },
  };
};
