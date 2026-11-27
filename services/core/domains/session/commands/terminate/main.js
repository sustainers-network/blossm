import deps from "./deps.js";

export default async ({ context, aggregateFn }) => {
  // Get the aggregate for this session.
  const sessionAggregate = await aggregateFn(context.session.root);

  // Make sure the session isn't already terminated.
  if (sessionAggregate.state.terminated)
    throw deps.badRequestError.message(
      "This session has already been terminated."
    );

  return {
    events: [
      // Terminate the session.
      {
        root: context.session.root,
        action: "terminate",
        // Numbered, so it is written before the command answers. A queued
        // event would leave the session usable for a moment after logout.
        correctNumber: sessionAggregate.lastEventNumber + 1,
        payload: { terminated: deps.stringDate() },
      },
    ],
    // Revoke the session's access to the network.
    revoke: [
      { type: "access", network: context.network || process.env.NETWORK },
    ],
  };
};
