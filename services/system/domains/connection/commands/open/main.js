import { MILLISECONDS_IN_DAY } from "@blossm/duration-consts";

const NINETY_DAYS = 90 * MILLISECONDS_IN_DAY;

import deps from "./deps.js";

export default async ({ context }) => {
  // Only a key opens a connection. A token that a connection already issued
  // would otherwise renew itself for as long as it liked, key revoked or not.
  if (!context.key || context.connection)
    throw deps.forbiddenError.message("A connection can only be opened by a key.");

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
        key: "access",
        location: "global",
        version: "1",
        project: process.env.GCP_PROJECT,
      }),
  });

  return {
    response: {
      token: { network: process.env.NETWORK, key: "access", value: token },
      receipt: {
        connection: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
