module.exports = {
  create: (_, event) => {
    return {
      body: {
        name: event.payload.name,
        network: event.payload.network,
      },
    };
  },
};
