const deps = require("./deps");

module.exports = async ({ root }) => {
  const { body: aggregate } = await deps
    .eventStore({ domain: "key", service: "system" })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .aggregate(root);

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
