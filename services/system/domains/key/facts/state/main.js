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
    principle: aggregate.state.principle,
    network: aggregate.state.network,
  };
};
