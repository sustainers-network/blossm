import deps from "./deps.js";

export default async ({ payload, context, commandFn }) => {
  // Create new roots for the store.
  const shopRoot = deps.uuid();

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
        root: shopRoot,
        domain: process.env.DOMAIN,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
  });

  // wallet.eth_address.transact(deploy a revnet). 
  // await txs to land.
  // get the revnetId.
  // store it.

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
              id: "StoreAdmin",
              subject: {
                root: shopRoot,
                domain: "store",
                service: process.env.SERVICE,
                network: process.env.NETWORK,
              },
            },
          ],
        },
      },
      {
        action: "register",
        root: shopRoot,
        context: newContext || context,
        payload: {
          name: payload.name,
          ticker: payload.ticker,
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
        shop: {
          root: shopRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    ...(_tokens && { tokens: _tokens }),
  };
};
