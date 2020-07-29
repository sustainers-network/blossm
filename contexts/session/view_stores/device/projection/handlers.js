module.exports = {
  core: {
    session: ({ state }) => {
      return {
        update: {
          name: state.device.type,
        },
      };
    },
  },
};
