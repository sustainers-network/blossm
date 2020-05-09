const deps = require("./deps");

// Internal requests will have no context.
module.exports = async ({ payload, context }) => {
  // Lazily set the environment variable.
  if (!process.env.GRIP_URL) {
    process.env.GRIP_URL = `${
      process.env.NODE_ENV == "local" ? "http" : "https"
    }://api.fanout.io/realm/${process.env.FANOUT_REALM_ID}?iss=${
      process.env.FANOUT_REALM_ID
    }&key=base64:${await deps.secret("fanout-realm-key")}`;
  }

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
          channel: payload.channel,
          ...(context && {
            node: context.node,
            key: context.key,
            connection: context.connection,
          }),
        },
        root: deps.uuid(),
      },
    ],
  };
};
