module.exports = async (event) => {
  return {
    body: {
      name: event.payload.name,
      network: event.payload.network,
    },
    root: event.headers.root,
  };
};
