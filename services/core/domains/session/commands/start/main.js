const { MILLISECONDS_IN_DAY } = require("@blossm/duration-consts");

const NINETY_DAYS = 90 * MILLISECONDS_IN_DAY;

const deps = require("./deps");

module.exports = async ({ payload, context = {} }) => {

  // Create the root for this session.
  const root = deps.uuid();

  // Create a long-lived token.
  const token = await deps.createJwt({
    options: {
      issuer: `${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.NETWORK}/start`,
      audience: [process.env.NETWORK, ...(context.network ? [context.network] : [])],
      expiresIn: NINETY_DAYS
    },
    payload: {
      context: {
        network: context.network || process.env.NETWORK,
        session: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK
        }
      }
    },
    signFn: deps.sign({
      ring: "jwt",
      key: "access",
      location: "global",
      version: "1",
      project: process.env.GCP_PROJECT
    })
  });

  return {
    events: [
      {
        root,
        action: "start",
        payload: {
          ...payload,
          started: deps.stringDate()
        },
        correctNumber: 0
      }
    ],
    response: {
      tokens: [{ network: context.network || process.env.NETWORK, type: "access", value: token }]
    }
  };
};
