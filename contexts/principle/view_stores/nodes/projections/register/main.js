module.exports = async (_, event) => {
  return {
    body: {
      scene: event.payload.scene.root,
      network: event.payload.network,
    },
  };
};
