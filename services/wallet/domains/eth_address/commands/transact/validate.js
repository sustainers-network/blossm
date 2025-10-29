import deps from "./deps.js";

export default ({ payload }) => {
  const errors = [];

  // Validate destinationAddress
  if (!payload.destinationAddress) {
    errors.push("destinationAddress is required");
  } else if (typeof payload.destinationAddress !== "string") {
    errors.push("destinationAddress must be a string");
  } else if (!deps.ethers.isAddress(payload.destinationAddress)) {
    errors.push("destinationAddress must be a valid Ethereum address");
  }

  // Validate abi
  if (!payload.abi) {
    errors.push("abi is required");
  } else if (!Array.isArray(payload.abi)) {
    errors.push("abi must be an array");
  }

  // Validate chainIds
  if (!payload.chainIds) {
    errors.push("chainIds is required");
  } else {
    const chainIds = Array.isArray(payload.chainIds) ? payload.chainIds : [payload.chainIds];
    const supportedChains = [1, 137, 42161]; // Ethereum, Polygon, Arbitrum
    
    for (const chainId of chainIds) {
      if (typeof chainId !== "number" || !Number.isInteger(chainId)) {
        errors.push("chainIds must be integers");
        break;
      }
      if (!supportedChains.includes(chainId)) {
        errors.push(`Unsupported chainId: ${chainId}. Supported chains: ${supportedChains.join(", ")}`);
      }
    }
  }

  // Validate functionName
  if (!payload.functionName) {
    errors.push("functionName is required");
  } else if (typeof payload.functionName !== "string") {
    errors.push("functionName must be a string");
  }

  // Validate parameters
  if (!Array.isArray(payload.parameters)) {
    errors.push("parameters must be an array");
  }

  // Validate value (optional)
  if (payload.value !== undefined) {
    if (typeof payload.value !== "string" && typeof payload.value !== "number") {
      errors.push("value must be a string or number");
    } else {
      try {
        const value = BigInt(payload.value);
        if (value < 0) {
          errors.push("value must be non-negative");
        }
      } catch (e) {
        errors.push("value must be a valid number");
      }
    }
  }

  // Validate gasLimit (optional)
  if (payload.gasLimit !== undefined) {
    if (typeof payload.gasLimit !== "string" && typeof payload.gasLimit !== "number") {
      errors.push("gasLimit must be a string or number");
    } else {
      try {
        const gasLimit = BigInt(payload.gasLimit);
        if (gasLimit <= 0) {
          errors.push("gasLimit must be positive");
        }
      } catch (e) {
        errors.push("gasLimit must be a valid number");
      }
    }
  }

  return errors;
};

