module.exports = async (payload) => {
  return {
    scenes: payload.scenes.map((scene) => {
      return {
        roles: scene.roles,
        root: scene.root,
        service: scene.service,
        network: scene.network,
      };
    }),
  };
};
