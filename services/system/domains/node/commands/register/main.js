const deps = require("./deps");

module.exports = async ({ payload, context, claims }) => {
  // Create new roots for the scene and the node.
  const nodeRoot = deps.uuid();

  // Register the scene.
  const {
    body: {
      tokens,
      context: newContext,
      references: { principle, scene },
    },
  } = await deps
    .command({
      name: "register",
      domain: "scene",
      service: "core",
    })
    .set({ context, claims, tokenFns: { internal: deps.gcpToken } })
    .issue({
      root: nodeRoot,
      domain: process.env.DOMAIN,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
    });

  return {
    events: [
      {
        domain: "principle",
        service: principle.service,
        network: principle.network,
        action: "add-roles",
        root: principle.root,
        context: newContext,
        payload: {
          roles: [
            {
              id: "NodeAdmin",
              root: nodeRoot,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
        },
      },
      {
        action: "register",
        root: nodeRoot,
        context: newContext,
        payload: {
          network: payload.network,
          scene,
        },
      },
    ],
    response: {
      ...(tokens && { tokens }),
      ...(newContext && { context: newContext }),
      references: {
        node: {
          root: nodeRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
        scene,
      },
    },
  };
};
