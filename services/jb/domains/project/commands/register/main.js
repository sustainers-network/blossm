import deps from "./deps.js";

export default async ({ payload, context, commandFn }) => {
  // Create new roots for the project.
  const projectRoot = deps.uuid();

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
        root: projectRoot,
        domain: process.env.DOMAIN,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
  });

  // wallet.eth_address.transact(deploy a project). 
  // await txs to land.
  // get the projectId.
  // store it.
  let projectId;

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
              id: "ProjectAdmin",
              subject: {
                root: projectRoot,
                domain: process.env.DOMAIN,
                service: process.env.SERVICE,
                network: process.env.NETWORK,
              },
            },
          ],
        },
      },
      {
        action: "deploy",
        root: projectRoot,
        context: newContext || context,
        payload: {
          name: payload.name,
          id: projectId,
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
        project: {
          root: projectRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    ...(_tokens && { tokens: _tokens }),
  };
};
