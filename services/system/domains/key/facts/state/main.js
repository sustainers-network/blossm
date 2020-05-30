const deps = require("./deps");

module.exports = async ({ root }) => {
  const { body: aggregate } = await deps
    .eventStore({ domain: "key", service: "system" })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .aggregate(root);

  return {
    root,
    secret: aggregate.state.secret,
    node: aggregate.state.node,
    principal: aggregate.state.principal,
    network: aggregate.state.network,
  };
};
