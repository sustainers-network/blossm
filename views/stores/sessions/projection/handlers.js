export default {
  core: {
    session: ({ state, id }) => ({
      id,
      // Scope the view to its own session, matching the session in the token's context.
      context: {
        root: id,
        service: "core",
        network: process.env.NETWORK,
      },
      update: {
        device: state.device,
      },
    }),
  },
};
