module.exports = async ({ root, aggregateFn }) => {
  const aggregate = await aggregateFn(root, {
    domain: "key",
    service: "system",
  });

  return {
    response: {
      root,
      secret: aggregate.state.secret,
      scene: aggregate.state.scene,
      principal: aggregate.state.principal,
      network: aggregate.state.network,
    },
  };
};
