import deps from "./deps.js";

export default async ({ payload, context }) => {
  // Generate EVM wallet
  const wallet = deps.createWallet();

  // Encrypt the private key using KMS
  const privateKey = await deps.encrypt({
    message: wallet.privateKey,
    key: "private",
    ring: "address-private-keys",
    location: process.env.GCP_REGION,
    project: process.env.GCP_PROJECT,
    format: "base64",
  });

  // Generate a new root for this address
  const root = deps.uuid();

  return {
    events: [
      {
        action: "create-evm",
        root: root,
        payload: {
          ...(payload.name && { name: payload.name }),
          type: "evm",
          publicAddress: wallet.address,
          principal: context.principal,
          privateKey,
        },
      },
    ],
    response: {
      receipt: {
        address: {
          root: root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
}; 