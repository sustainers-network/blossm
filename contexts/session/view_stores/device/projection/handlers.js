module.exports = {
  core: {
    session: ({ state, root }) => {
      return {
        id: root,
        update: {
          name: state.device.type,
        },
      };
    },
  },
};
