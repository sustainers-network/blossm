module.exports = async event => {
  return {
    body: {
      scene: event.payload.scene.root,
      network: event.payload.network
    },
    root: event.headers.root
  };
};
