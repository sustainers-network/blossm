const deps = require("./deps");

module.exports = async ({ query, params, context }) => {
  const { body: nodes } = await deps
    .viewStore({
      name: "nodes",
      context: "principal",
    })
    .set({ context, tokenFns: { internal: deps.gcpToken } })
    .read();

  //eslint-disable-next-line no-console
  console.log("Do something with: ", { query, params, context, nodes });

  return { nodes };
};
