const { MILLISECONDS_IN_DAY } = require("@blossm/duration-consts");

const NINETY_DAYS = 90 * MILLISECONDS_IN_DAY;

const deps = require("./deps");

module.exports = async ({ payload, context }) => {
  const root = deps.uuid();

  const token = await deps.createJwt({
    options: {
      subject: context.principal.root,
      issuer: `${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.NETWORK}/open`,
      audience: process.env.NETWORK,
      expiresIn: NINETY_DAYS,
    },
    payload: {
      context: {
        ...context,
        connection: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    signFn: (message) =>
      deps.sign({
        message,
        ring: "jwt",
        key: payload.key,
        location: "global",
        version: "1",
        project: process.env.GCP_PROJECT,
      }),
  });

  return {
    events: [
      {
        action: "open",
        payload: {
          scene: context.scene,
          key: context.key,
          opened: deps.stringDate(),
        },
        root,
        correctNumber: 0,
      },
    ],
    response: {
      token: { network: process.env.NETWORK, key: payload.key, value: token },
      references: {
        connection: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
