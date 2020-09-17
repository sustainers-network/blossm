const deps = require("./deps");

// Internal requests will have no context.
module.exports = async ({ payload }) => {
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
      `event: update\ndata: ${JSON.stringify({
        ...(payload.view && { view: payload.view }),
        id: payload.id,
        trace: payload.trace,
        type: payload.type,
      })}\n\n`
    )
  );
};
