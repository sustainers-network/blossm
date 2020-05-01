const deps = require("./deps");

module.exports = async ({ context }) => {
  const [{
    body: keys
  }, {
    body: title
  }] = await Promise.all([
    deps
      .viewStore({
        name: "keys",
        context: "node",
      })
      .set({ context, tokenFns: { internal: deps.gcpToken } })
      .read(),
    deps
      .viewStore({
        name: "title",
        context: "node",
      })
      .set({ context, tokenFns: { internal: deps.gcpToken } })
      .read()
  ]);

  return { title, keys };
};
