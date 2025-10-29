import deps from "./deps.js";

export default async ({ payload, context, aggregateFn }) => {
  const { transactionId, status, receipt, bundleStatus, error } = payload;

  // Get the transaction aggregate from event store
  const transactionAggregate = await aggregateFn(transactionId, {
    domain: "eth_transaction",
    service: "wallet",
  });

  if (!transactionAggregate) {
    throw deps.internalServer.message("Transaction not found");
  }

  return {
    events: [
      {
        action: "update-status",
        root: transactionId,
        payload: {
          status,
          ...(receipt && { receipt }),
          ...(bundleStatus && { bundleStatus }),
          ...(error && { error }),
        },
      },
    ],
    response: {
      receipt: {
        transaction: {
          root: transactionId,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
