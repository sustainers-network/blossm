module.exports = (payload) => ({
  scene: {
    root: payload.scene.root,
    service: payload.scene.service,
    network: payload.scene.network,
  },
});
