module.exports = (payload) => {
  return {
    principle: {
      root: payload.principle.root,
      service: payload.principle.service,
      network: payload.principle.network,
    },
  };
};
