module.exports = {
  core: {
    session: {
      start: ({ payload }) => {
        return {
          update: {
            name: payload.device.type,
          },
        };
      },
    },
  },
};
