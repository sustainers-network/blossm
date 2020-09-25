const deps = require("./deps");

// Internal requests will have no context.
module.exports = async ({ payload }) => {
  //TODO
  console.log({ payload: JSON.stringify(payload) });

  const pub = new deps.grip.GripPubControl({
    control_uri: `https://api.fanout.io/realm/${process.env.FANOUT_REALM_ID}`,
    control_iss: process.env.FANOUT_REALM_ID,
    key: Buffer.from(`${await deps.secret("fanout-realm-key")}`, "base64"),
  });

  await pub.publishHttpStream(payload.channel, {
    ...(payload.view && { view: payload.view }),
    id: payload.id,
    trace: payload.trace,
    type: payload.type,
  });
};
