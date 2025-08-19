import deps from "./deps.js";

export default async ({ payload, context, claims, aggregateFn }) => {
  // Get aggregates for the principal, this session, and the context to be switched in to.
  // TODO why claims.sub and not context.principal.root?
  const [principalAggregate, sessionAggregate, sceneAggregate] = await Promise.all([
    // The principal's root is the session token's subject.
    aggregateFn(claims.sub, {
      domain: "principal",
    }),
    aggregateFn(context.session.root),
    aggregateFn(payload.scene, {
      domain: "scene",
    }),
  ]);

  // Make sure the principal has access to the context being changed to.
  if (
    !(principalAggregate.state.scenes || []).some(
      (scene) => scene.root == payload.scene
    )
  )
    throw deps.forbiddenError.message("This scene isn't accessible.", {
      info: { scene: payload.scene },
    });

  // Make sure the session hasn't already been terminated.
  if (sessionAggregate.state.terminated)
    throw deps.badRequestError.message("This session is terminated.");

  // Remove the old context domain.
  delete context[context.domain];

  // Create a new token inheriting from the current session.
  const token = await deps.createJwt({
    options: {
      issuer: claims.iss,
      subject: claims.sub,
      audience: claims.aud,
      expiresIn: Date.parse(claims.exp) - deps.fineTimestamp(),
    },
    payload: {
      context: {
        // Inherit the current session's context.
        ...context,
        // Add the scene.
        scene: {
          root: payload.scene,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
        // Add the domain of the new scene.
        domain: sceneAggregate.state.domain,

        // Add the routing information of the new scene.
        [sceneAggregate.state.domain]: {
          root: sceneAggregate.state.root,
          service: sceneAggregate.state.service,
          network: sceneAggregate.state.network,
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
    events: [
      // Change the session's scene.
      {
        action: "change-scene",
        root: context.session.root,
        payload: {
          scene: {
            root: payload.scene,
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        },
      },
    ],
    tokens: [
      {
        // The token can access the network specified in the context, or this service's network.
        network: context.network || process.env.NETWORK,
        type: "access",
        value: token,
      },
    ],
  };
};
