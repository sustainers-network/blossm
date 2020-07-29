const deps = require("./deps");

module.exports = async ({ context, aggregateFn }) => {
  // Get the aggregate for this session.
  const aggregate = await aggregateFn(context.session.root);

  // Check to see if this session has already been terminated.
  if (aggregate.state.terminated)
    throw deps.badRequestError.message(
      "This session has already been terminated."
    );

  return {
    events: [
      {
        root: context.session.root,
        action: "terminate",
        payload: { terminated: deps.stringDate() },
      },
    ],
  };
};
