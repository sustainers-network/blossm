module.exports = async (payload) => {
  return {
    scenes: payload.scenes.map((scene) => {
      return {
        role: scene.role,
        root: scene.root,
        service: scene.service,
        network: scene.network,
      };
    }),
  };
};
