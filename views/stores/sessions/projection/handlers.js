export default {
  core: {
    session: ({ state, id }) => ({
      id,
      update: {
        device: state.device,
      },
    }),
  },
};
