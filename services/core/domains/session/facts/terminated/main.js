const deps = require("./deps");

module.exports = async ({ context }) => {
  const { body: aggregate } = await deps
    .eventStore({
      domain: process.env.DOMAIN,
    })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .aggregate(context.session.root);

  return { response: aggregate.state.terminated != undefined };
};
