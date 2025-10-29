import deps from "./deps.js";

// Get RPC URL for a given chain ID
const getRpcUrlForChain = (chainId) => {
  const rpcUrls = {
    1: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    10: process.env.OPTIMISM_RPC_URL || "https://optimism.llamarpc.com",
    8453: process.env.BASE_RPC_URL || "https://base.llamarpc.com",
    42161: process.env.ARBITRUM_RPC_URL || "https://arbitrum.llamarpc.com",
    11155111: process.env.ETHEREUM_SEPOLIA_RPC_URL || "https://ethereum-sepolia.llamarpc.com",
    84532: process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia.llamarpc.com",
    11155420: process.env.OPTIMISM_SEPOLIA_RPC_URL || "https://optimism-sepolia.llamarpc.com",
    421614: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia.llamarpc.com",
  };
  
  return rpcUrls[chainId] || process.env.DEFAULT_RPC_URL || "https://eth.llamarpc.com";
};

// Poll Relayr bundle status with exponential backoff
const pollRelayrBundleStatus = async (bundleUuid, callback) => {
  let done = false;
  let retryCount = 0;
  const maxRetries = 10;

  while (!done) {
    try {
      const res = await deps.request.get(`https://api.relayr.ba5ed.com/v1/bundle/${bundleUuid}`);
      
      if (res.statusCode !== 200) {
        throw new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
      }

      const bundleStatus = res.body;
      
      // Call callback with current status
      try {
        callback(bundleStatus);
      } catch (callbackErr) {
        // Handle callback errors silently
        console.error("Error in callback:", callbackErr);
      }

      // Reset retry count on successful request
      retryCount = 0;

      // Check if all transactions are in final state
      done = bundleStatus.transactions.every(tx => 
        tx.status && (tx.status.state === 'Success' || tx.status.state === 'Failed')
      );

      if (done) {
        // Final callback with completed status
        try {
          callback(bundleStatus);
        } catch (callbackErr) {
          console.error("Error in final callback:", callbackErr);
        }
        break;
      } else {
        // Continue polling with default interval
        await new Promise(r => setTimeout(r, 3000));
      }

    } catch (err) {
      retryCount++;
      
      if (retryCount <= maxRetries) {
        // Show retry message to user
        try {
          callback({
            transactions: [],
            error: `Checking deployment status... (${retryCount}/${maxRetries})`,
            retrying: true
          });
        } catch (callbackErr) {
          console.error("Error in retry callback:", callbackErr);
        }

        // Exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(r => setTimeout(r, retryDelay));
      } else {
        // Max retries exceeded, switch to longer polling interval
        try {
          callback({
            transactions: [],
            error: 'Checking deployment status periodically...',
            retrying: true
          });
        } catch (callbackErr) {
          console.error("Error in max retry callback:", callbackErr);
        }

        // Longer fixed polling interval
        await new Promise(r => setTimeout(r, 30000));
        
        // Reset retry count for next cycle
        retryCount = 0;
      }
    }
  }

  return done;
};

// Monitor single-chain transaction
const monitorSingleChainTransaction = async (chainId, transactionHash) => {
  const rpcUrl = getRpcUrlForChain(chainId);
  const publicClient = deps.createPublicClient({
    transport: deps.http(rpcUrl)
  });

  try {
    // Wait for transaction receipt
    const receipt = await deps.waitForTransactionReceipt(publicClient, {
      hash: transactionHash,
      timeout: 300000, // 5 minutes timeout
    });

    // Determine status based on receipt
    const status = receipt.status === "success" ? "succeeded" : "failed";

    return {
      status,
      receipt
    };
  } catch (error) {
    // Return failed status if there's an error
    return {
      status: "failed",
      error: error.message
    };
  }
};

// Monitor multi-chain transaction via Relayr
const monitorMultiChainTransaction = async (bundleId) => {
  try {
    let finalStatus = "failed";
    let finalBundleStatus = null;

    // Poll Relayr bundle status
    await pollRelayrBundleStatus(bundleId, (bundleStatus) => {
      finalBundleStatus = bundleStatus;
      
      // Check if all transactions are complete
      const allComplete = bundleStatus.transactions.every(tx => 
        tx.status && (tx.status.state === 'Success' || tx.status.state === 'Failed')
      );

      if (allComplete) {
        // Determine overall status
        const allSuccessful = bundleStatus.transactions.every(tx => 
          tx.status && tx.status.state === 'Success'
        );
        finalStatus = allSuccessful ? "succeeded" : "failed";
      }
    });

    return {
      status: finalStatus,
      bundleStatus: finalBundleStatus
    };
  } catch (error) {
    // Return failed status if there's an error
    return {
      status: "failed",
      error: error.message
    };
  }
};

export default async ({ payload, context, aggregateFn }) => {
  const { transactionId, type = "single" } = payload;

  // Get the transaction aggregate from event store
  const transactionAggregate = await aggregateFn(transactionId, {
    domain: "eth_transaction",
    service: "wallet",
  });

  if (!transactionAggregate) {
    throw deps.internalServer.message("Transaction not found");
  }

  const transaction = transactionAggregate.state;

  // Don't monitor transactions that are already in final states
  if (transaction.status === "succeeded" || transaction.status === "failed") {
    return {
      events: [
        {
          action: "monitor",
          root: transactionId,
          payload: {
            status: transaction.status,
            message: "Transaction already in final state"
          },
        },
      ],
      response: {
        transactionId,
        status: transaction.status,
        message: "Transaction already in final state"
      },
    };
  }

  let result;

  try {
    if (type === "single") {
      // Monitor single-chain transaction
      const { chainId, transactionHash } = transaction;
      if (!chainId || !transactionHash) {
        throw new Error("Missing chainId or transactionHash for single-chain transaction");
      }
      
      result = await monitorSingleChainTransaction(chainId, transactionHash);
    } else if (type === "multi") {
      // Monitor multi-chain transaction via Relayr
      const { bundleId } = transaction;
      if (!bundleId) {
        throw new Error("Missing bundleId for multi-chain transaction");
      }
      
      result = await monitorMultiChainTransaction(bundleId);
    } else {
      throw new Error("Invalid transaction type. Must be 'single' or 'multi'");
    }

    return {
      events: [
        {
          action: "monitor",
          root: transactionId,
          payload: {
            status: result.status,
            type,
            ...(result.receipt && { receipt: result.receipt }),
            ...(result.bundleStatus && { bundleStatus: result.bundleStatus }),
          },
        },
      ],
      response: {
        transactionId,
        status: result.status,
        type,
        ...(result.receipt && { receipt: result.receipt }),
        ...(result.bundleStatus && { bundleStatus: result.bundleStatus }),
      },
    };
  } catch (error) {
    return {
      events: [
        {
          action: "monitor",
          root: transactionId,
          payload: {
            status: "failed",
            error: error.message,
          },
        },
      ],
      response: {
        transactionId,
        status: "failed",
        error: error.message,
      },
    };
  }
};