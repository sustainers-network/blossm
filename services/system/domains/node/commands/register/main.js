import deps from "./deps.js";

// A network is a host name, written one way only. A trailing dot or a stray
// character would give one network two names that prove against the same DNS
// record, and a name that channels and tokens can't carry.
const hostname =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export default async ({ payload, context, commandFn }) => {
  if (!hostname.test(payload.network) || payload.network.length > 253)
    throw deps.badRequestError.message("This network isn't a host name.");

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
      subject: {
        root: nodeRoot,
        domain: process.env.DOMAIN,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
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
