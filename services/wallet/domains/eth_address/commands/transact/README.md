# Transact Command

This command handles blockchain transactions for Ethereum addresses, supporting both single-chain and multi-chain deployments through the Relayr service.

## Features

- **Single Chain Transactions**: Direct blockchain transactions for single chain deployments
- **Multi-Chain Transactions**: Uses Relayr service for cross-chain transaction bundling
- **Automatic Payment Selection**: Automatically chooses to pay on mainnet (chain ID 1) when available
- **ERC-2771 Meta-Transactions**: Supports gasless transactions through forwarder contracts
- **Private Key Management**: Secure private key handling through GCP KMS encryption

## Payload Schema

```javascript
{
  destinationAddress: string,    // Required: Target contract address
  abi: array,                   // Required: Contract ABI
  chainIds: array|number,       // Required: Chain ID(s) to deploy to
  functionName: string,         // Required: Function to call on contract
  parameters: array,            // Required: Function parameters
  value: string,                // Optional: ETH value to send (default: "0")
  gasLimit: string              // Optional: Gas limit (default: "8000000")
}
```

## Supported Chains

- **Ethereum Mainnet**: Chain ID 1
- **Polygon**: Chain ID 137  
- **Arbitrum**: Chain ID 42161

## Payment Flow

For multi-chain transactions, the command follows this flow:

1. **Prepare Transactions**: Creates signed ERC-2771 forward requests for each target chain
2. **Get Quote**: Requests a quote from Relayr service with all prepared transactions
3. **Select Payment**: Automatically selects the mainnet (chain ID 1) payment option from the quote
4. **Send Payment**: Executes the payment transaction on mainnet using the private key
5. **Return Results**: Returns both the payment transaction details and the original quote

The command will throw an error if no mainnet payment option is available in the Relayr quote.

## Usage Examples

### Single Chain Transaction
```javascript
{
  destinationAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  abi: [...],
  chainIds: [1],
  functionName: "transfer",
  parameters: ["0x1234...", "1000000000000000000"],
  value: "0"
}
```

### Multi-Chain Transaction
```javascript
{
  destinationAddress: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  abi: [...],
  chainIds: [1, 137, 42161],
  functionName: "mint",
  parameters: ["0x1234...", 100]
}
```

## Response Format

### Single Chain
```javascript
{
  events: [{
    action: "transact",
    root: "principal-root",
    payload: {
      chainId: 1,
      transactionHash: "0x...",
      status: 1,
      gasUsed: "21000"
    }
  }],
  response: {
    receipt: {
      transactionHash: "0x...",
      chainId: 1,
      status: 1,
      gasUsed: "21000",
      blockNumber: 12345
    }
  }
}
```

### Multi-Chain (Relayr)
```javascript
{
  events: [{
    action: "transact",
    root: "principal-root",
    payload: {
      chainIds: [1, 137, 42161],
      quoteId: "quote-123",
      status: "paid",
      transactions: 3,
      paymentChainId: 1,
      paymentTxHash: "0xpayment123"
    }
  }],
  response: {
    receipt: {
      quoteId: "quote-123",
      chainIds: [1, 137, 42161],
      status: "paid",
      transactions: 3,
      paymentChainId: 1,
      paymentTxHash: "0xpayment123",
      paymentReceipt: {...},
      quote: {...}
    }
  }
}
```

## Dependencies

- `ethers`: Ethereum library for blockchain interactions
- `@blossm/gcp-secret`: GCP KMS integration for private key management
- `@blossm/errors`: Error handling utilities

## Environment Variables

- `ETHEREUM_RPC_URL`: Ethereum mainnet RPC endpoint
- `POLYGON_RPC_URL`: Polygon RPC endpoint  
- `ARBITRUM_RPC_URL`: Arbitrum RPC endpoint
- `GCP_REGION`: GCP region for KMS
- `GCP_PROJECT`: GCP project ID
