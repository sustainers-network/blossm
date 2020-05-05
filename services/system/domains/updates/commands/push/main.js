const deps = require("./deps");

module.exports = async ({ payload, context }) => {
  await deps.faasGrip.publish(
    payload.channel,
    new deps.grip.HttpStreamFormat(
      `event: update\ndata: ${JSON.stringify(payload.view)}\n\n`
    )
  );

  return {
    events: [
      {
        action: "push",
        payload: {
          node: context.node,
          key: context.key,
          connection: context.connection,
        },
        root: payload.channel,
      },
    ],
  };
};
