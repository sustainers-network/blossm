module.exports = async event => {
  return {
    created: event.headers.created,
    scene: event.payload.scene.root,
    network: event.payload.network
  };
};
