const deps = require("./deps");

module.exports = async ({ context, root }) => {
  const { body: aggregate } = await deps
    .eventStore({
      domain: "principal",
      service: "core",
    })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .aggregate(root);

  const roles = aggregate.state.roles.filter(
    (role) => role.network == context.network
  );

  return { response: roles };
};
