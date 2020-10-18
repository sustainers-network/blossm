module.exports = (payload) => {
  const normalizedPayload = {};
  for (const key in payload) {
    if (typeof payload[key] != "object") continue;
    normalizedPayload[key] = {
      root: payload[key].root,
      service: payload[key].service,
      network: payload[key].network,
    };
  }
  return normalizedPayload;
};
