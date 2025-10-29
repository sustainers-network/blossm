import deps from "./deps.js";

const revDeployerABI = [];
const revDeployerAddress = (chainId) => {
  if (chainId === 1) {
    return "0x0000000000000000000000000000000000000000";
  } else if (chainId === 137) {
    return "0x0000000000000000000000000000000000000000";
  } else if (chainId === 42161) {
    return "0x0000000000000000000000000000000000000000";
  } else {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }
} 

const USDCAddress = (chainId) => {
  if (chainId === 1) {
    return "0x0000000000000000000000000000000000000000";
  } else if (chainId === 137) {
    return "0x0000000000000000000000000000000000000000";
  } else if (chainId === 42161) {
    return "0x0000000000000000000000000000000000000000";
  } else {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }
}

export default async ({ payload, context, commandFn }) => {
  // Create new roots for the revnet.
  const revnetRoot = deps.uuid();

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
        root: revnetRoot,
        domain: process.env.DOMAIN,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
  });

  // wallet.eth_address.transact(deploy a revnet). 
  // Need the REVDeployer address, its ABI, and all launch params. 
  // Send to relayr to get quote. Sign inline.
  // await txs to land.
  // get the revnetId.
  // store it.
  // For each instance, get the createTx and projectId.
  let revnetId = 12345; // TODO: Replace with actual revnet ID from deployment

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
              id: "RevnetAdmin",
              subject: {
                root: revnetRoot,
                domain: process.env.DOMAIN,
                service: process.env.SERVICE,
                network: process.env.NETWORK,
              },
            },
          ],
        },
      },
      // Log the deploy of the revnet.
      {
        action: "deploy",
        root: revnetRoot,
        context: newContext || context,
        payload: {
          id: revnetId,
          scene,
        }
      },
      // Log the deploy of the project. 
      {
        domain: "project",
        action: "deploy",
        root: revnetRoot,
        context: newContext || context,
        payload: {
          id: revnetId,
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
        revnet: {
          root: revnetRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
    ...(_tokens && { tokens: _tokens }),
  };
};
