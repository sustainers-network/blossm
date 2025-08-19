import deps from "./deps.js";

export default async ({ payload, context, claims, aggregateFn }) => {
  // If there's nothing to upgrade to, dont save events.
  if (!Object.keys(payload).length) return;

  // Get the aggregate for this session.
  const sessionAggregate = await aggregateFn(context.session.root);

  // Make sure the session isn't terminated.
  if (sessionAggregate.state.terminated)
    throw deps.badRequestError.message("This session is terminated.");
  
  // The new context of the session should be appended to the current context.
  const newContext = {
    ...context,
    ...payload,
  };
  
  // The subject of the session should be the current session subject, or the root of the newly added principal.
  // TODO this implies that if there is no claims.sub, there MIUST be a payload.principal.root. is this correct?
  const subject = claims.sub || payload.principal.root;

  // Create a new token inheriting from the current claims.
  const token = await deps.createJwt({
    options: {
      issuer: claims.iss,
      subject,
      audience: claims.aud,
      expiresIn: Date.parse(claims.exp) - deps.fineTimestamp(),
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
      // Upgrade the session.
      {
        root: context.session.root,
        action: "upgrade",
        payload,
      },
    ],
    response: {
      context: newContext,
    },
    tokens: [
      {
        // The token should be used by the context's network, or the network of this service.
        network: context.network || process.env.NETWORK,
        type: "access",
        value: token,
      },
    ],
  };
};
