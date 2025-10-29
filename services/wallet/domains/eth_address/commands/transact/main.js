import deps from "./deps.js";

// Decrypt private key from KMS
const decryptPrivateKey = async (encryptedPrivateKey) => {
  const decrypted = await deps.gcpKms.decrypt({
    message: encryptedPrivateKey,
    key: "private",
    ring: "address-private-keys",
    location: process.env.GCP_REGION,
    project: process.env.GCP_PROJECT,
    format: "base64",
  });
  
  return decrypted;
};

// Helper function to find mainnet payment info from Relayr quote
const findMainnetPaymentInfo = (quote) => {
  // Look for payment_info array in the quote
  if (quote.payment_info && Array.isArray(quote.payment_info)) {
    // Find the payment option for mainnet (chain ID 1)
    const mainnetPayment = quote.payment_info.find(info => info.chain === 1);
    if (mainnetPayment) {
      return {
        target: mainnetPayment.target,
        calldata: mainnetPayment.calldata,
        amount: mainnetPayment.amount,
        chain: 1
      };
    }
  }
  
  // Fallback: look for other possible structures
  if (quote.payment && quote.payment.chain === 1) {
    return {
      target: quote.payment.target,
      calldata: quote.payment.calldata,
      amount: quote.payment.amount,
      chain: 1
    };
  }
  
  return null;
};

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

export default async ({ payload, context, aggregateFn }) => {
  const {
    destinationAddress,
    abi,
    chainIds,
    functionName,
    parameters,
    value = "0",
    gasLimit = "8000000"
  } = payload;

  // Ensure chainIds is an array
  chainIds = Array.isArray(chainIds) ? chainIds : [chainIds];

  // Get the address aggregate to retrieve the encrypted private key
  const addressAggregate = await aggregateFn(context.principal.root);
  if (!addressAggregate || !addressAggregate.privateKey) {
    throw new Error("Address not found or private key not available");
  }

  // Decrypt the private key
  const privateKey = await decryptPrivateKey(addressAggregate.privateKey);

  // Handle single chain vs multi-chain deployment
  if (chainIds.length === 1) {
    return await handleSingleChainTransaction(
      chainIds[0],
      destinationAddress,
      abi,
      functionName,
      parameters,
      value,
      gasLimit,
      privateKey,
      context
    );
  } else {
    return await handleMultiChainTransaction(
      chainIds,
      destinationAddress,
      abi,
      functionName,
      parameters,
      value,
      gasLimit,
      privateKey,
      context
    );
  }
};

// Handle single chain transaction
const handleSingleChainTransaction = async (
  chainId,
  destinationAddress,
  abi,
  functionName,
  parameters,
  value,
  gasLimit,
  privateKey,
  context
) => {
  // Get RPC URL for the chain (you'll need to implement chain-to-RPC mapping)
  const rpcUrl = getRpcUrlForChain(chainId);
  const publicClient = deps.getProvider(rpcUrl);
  const walletClient = deps.createWalletClient({
    account: privateKey,
    transport: deps.http(rpcUrl)
  });

  // Encode function data
  const encodedData = deps.encodeFunctionData({
    abi,
    functionName,
    args: parameters
  });

  // Send transaction
  const txHash = await walletClient.sendTransaction({
    to: destinationAddress,
    value: BigInt(value),
    data: encodedData,
    gas: BigInt(gasLimit)
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    events: [
      {
        action: "transact",
        root: context.principal.root,
        payload: {
          chainId,
          transactionHash: receipt.transactionHash,
          status: receipt.status,
          gasUsed: receipt.gasUsed.toString(),
        },
      },
    ],
    response: {
      receipt: {
        transactionHash: receipt.transactionHash,
        chainId,
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
      },
    },
  };
};

// Handle multi-chain transaction using Relayr
const handleMultiChainTransaction = async (
  chainIds,
  destinationAddress,
  abi,
  functionName,
  parameters,
  value,
  gasLimit,
  privateKey,
  context
) => {
  // Get wallet address from private key
  const walletClient = deps.createWalletClient({
    account: privateKey,
    transport: deps.http("https://eth.llamarpc.com") // Temporary for getting address
  });
  const userAddress = walletClient.account.address;
  const relayrTransactions = [];

  // Prepare transactions for each chain
  for (const chainId of chainIds) {
    const rpcUrl = getRpcUrlForChain(chainId);

    // Encode function data
    const encodedData = deps.encodeFunctionData({
      abi,
      functionName,
      args: parameters
    });

    // Create forward request for ERC-2771
    const forwardRequestData = {
      from: userAddress,
      to: destinationAddress,
      value: value,
      gas: gasLimit,
      data: encodedData,
    };

    // Sign the forward request
    const encoded = await deps.signErc2771ForwardRequest({
      forwardRequestData,
      chainId,
      privateKey,
      rpcUrl,
      domainName: "Blossm",
      version: "1",
      deadline: Math.floor((Date.now() + 3600 * 48 * 1000) / 1000) // 48 hours from now
    });

    // Add to relayr transactions
    relayrTransactions.push({
      chain: chainId,
      data: encoded,
      target: deps.erc2771ForwarderContract(chainId),
      value: "0"
    });
  }

  // Get quote from Relayr
  const quote = await deps.getRelayrTxQuote(relayrTransactions);
  
  if (!quote) {
    throw new Error("Failed to get Relayr quote");
  }

  // Automatically choose to pay on mainnet (chain ID 1)
  const mainnetPaymentInfo = findMainnetPaymentInfo(quote);
  
  if (!mainnetPaymentInfo) {
    throw new Error("No mainnet payment option available in quote");
  }

  // Send the payment transaction on mainnet
  const mainnetRpcUrl = getRpcUrlForChain(1);
  const paymentTx = await deps.sendRelayrTx(mainnetPaymentInfo, privateKey, mainnetRpcUrl);
  const paymentReceipt = await paymentTx.wait();

  return {
    events: [
      {
        action: "transact",
        root: context.principal.root,
        payload: {
          chainIds,
          quoteId: quote.id || quote.quoteId,
          status: "paid",
          transactions: relayrTransactions.length,
          paymentChainId: 1,
          paymentTxHash: paymentReceipt.hash,
        },
      },
    ],
    response: {
      receipt: {
        quoteId: quote.id || quote.quoteId,
        chainIds,
        status: "paid",
        transactions: relayrTransactions.length,
        paymentChainId: 1,
        paymentTxHash: paymentReceipt.hash,
        paymentReceipt,
        quote,
      },
    },
  };
};
