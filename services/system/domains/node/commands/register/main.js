const deps = require("./deps");

module.exports = async ({ payload, context, commandFn }) => {
  // Create new roots for the node.
  const nodeRoot = deps.uuid();

  // Register the scene.
  const {
    body: {
      tokens,
      context: newContext,
      receipt: { principal, scene },
    },
  } = await commandFn({
    name: "register",
    domain: "scene",
    service: "core",
    payload: {
      root: nodeRoot,
      domain: process.env.DOMAIN,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
    },
  });

  const {
    body: {
      receipt: { group },
    },
  } = await commandFn({
    name: "add-principals",
    domain: "group",
    service: "core",
    payload: {
      principals: [
        {
          roles: ["GroupAdmin"],
          ...(principal || context.principal),
        },
      ],
    },
  });

  return {
    events: [
      {
        domain: "principal",
        service: (newContext || context).principal.service,
        network: (newContext || context).principal.network,
        action: "add-roles",
        root: (newContext || context).principal.root,
        context: newContext || context,
        payload: {
          roles: [
            {
              id: "NodeAdmin",
              root: nodeRoot,
              domain: "node",
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
        },
      },
      {
        action: "register",
        root: nodeRoot,
        context: newContext || context,
        payload: {
          network: payload.network,
          scene,
        },
        groupsAdded: [group],
      },
    ],
    response: {
      ...(tokens && { tokens }),
      ...(newContext && { context: newContext }),
      receipt: {
        ...(principal && { principal }),
        ...(group && { group }),
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
