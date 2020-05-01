const deps = require("./deps");

module.exports = async ({ context }) => {
  const { body: nodes } = await deps
    .viewStore({
      name: "nodes",
      context: "principle",
    })
    .set({ context, tokenFns: { internal: deps.gcpToken } })
    .read();

  return { nodes };
};
