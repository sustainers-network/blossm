import { MILLISECONDS_IN_DAY } from "@blossm/duration-consts";

const NINETY_DAYS = 90 * MILLISECONDS_IN_DAY;

import deps from "./deps.js";

export default async ({ payload, context = {}, ip }) => {
  // Create the root for this session.
  const root = deps.uuid();
  
  // This context will be attached to the session token.
  const newContext = {
    // If the current session has a network, use it in continuation of that session. Else use this service's network.
    network: context.network || process.env.NETWORK,
    // This session will be attached to the context..
    session: {
      root,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
    },
    // The device will be attached to the context.
    device: { ...payload.device, ...(ip && { ip }) },
  };

  // Create a long-lived token that'll last 90 days.
  const token = await deps.createJwt({
    options: {
      // The issuer is this service.
      issuer: `${process.env.DOMAIN}.${process.env.SERVICE}.${process.env.NETWORK}/start`,
      // The audience that the token is valid for is this service's network and the network of the current session if it exists.
      // This allows the token to access `core` services as well as application services if they're on a different network.
      audience: [
        // The network of this service.
        process.env.NETWORK,
        ...(context.network && context.network != process.env.NETWORK
          ? [context.network]
          : []),
      ],
      expiresIn: NINETY_DAYS,
    },
    payload: {
      context: newContext,
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
    events: [
      {
        root,
        action: "start",
        payload: {
          ...payload,
          device: { ...payload.device, ...(ip && { ip }) },
        },
        correctNumber: 0,
      },
    ],
    response: {
      context: newContext,
      receipt: {
        session: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    // Set the access token.
    tokens: [
      {
        // The network will be the `domain` of the access token. Browsers use the `domain` to only send cookies to the same domain.
        network: context.network || process.env.NETWORK,
        type: "access",
        value: token,
      },
    ],
  };
};
