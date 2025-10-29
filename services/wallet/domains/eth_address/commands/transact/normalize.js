import deps from "./deps.js";

export default ({ payload }) => {
  const normalized = { ...payload };

  // Ensure chainIds is always an array
  if (!Array.isArray(normalized.chainIds)) {
    normalized.chainIds = [normalized.chainIds];
  }

  // Ensure value is a string
  if (typeof normalized.value !== "string") {
    normalized.value = normalized.value?.toString() || "0";
  }

  // Ensure gasLimit is a string
  if (typeof normalized.gasLimit !== "string") {
    normalized.gasLimit = normalized.gasLimit?.toString() || "8000000";
  }

  // Normalize destination address (ensure it's lowercase)
  if (normalized.destinationAddress) {
    normalized.destinationAddress = normalized.destinationAddress.toLowerCase();
  }

  // Ensure parameters is an array
  if (!Array.isArray(normalized.parameters)) {
    normalized.parameters = [];
  }

  return normalized;
};



