import deps from "./deps.js";

export default async ({ payload, context, generateRootFn }) => {
  const {
    type = "single",
    chainId,
    transactionHash,
    bundleId,
    status = "submitted"
  } = payload;

  // Validate required fields based on transaction type
  if (type === "single" && (!chainId || !transactionHash)) {
    throw deps.internalServer.message("Missing chainId or transactionHash for single-chain transaction");
  }

  if (type === "multi" && !bundleId) {
    throw deps.internalServer.message("Missing bundleId for multi-chain transaction");
  }

  return {
    events: [
      {
        action: "register",
        root: generateRootFn(),
        payload: {
          type,
          status,
          ...(chainId && { chainId }),
          ...(transactionHash && { transactionHash }),
          ...(bundleId && { bundleId }),
        },
      },
    ],
    response: {
      receipt: {
        transaction: {
          root: generateRootFn(),
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};