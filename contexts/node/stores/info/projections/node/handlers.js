module.exports = {
  register: (_, event) => {
    return {
      body: {
        network: event.payload.network,
      },
    };
  },
};
