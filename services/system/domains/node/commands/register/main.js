import deps from "./deps.js";

export default async ({ payload, context, commandFn }) => {
  // Create new roots for the node.
  const nodeRoot = deps.uuid();

  // Register the scene.
  const {
    body: {
      _tokens,
      context: newContext,
      receipt: { principal, scene, group },
    },
  } = await commandFn({
    name: "register",
    domain: "scene",
    service: "core",
    payload: {
      role: "SceneAdmin",
      root: nodeRoot,
      domain: process.env.DOMAIN,
      service: process.env.SERVICE,
      network: process.env.NETWORK,
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
              subject: {
                root: nodeRoot,
                domain: "node",
                service: process.env.SERVICE,
                network: process.env.NETWORK,
              },
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
        }
      },
    ],
    response: {
      ...(newContext && { context: newContext }),
      receipt: {
        ...(principal && { principal }),
        scene,
        group,
        node: {
          root: nodeRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    ...(_tokens && { tokens: _tokens }),
  };
};
