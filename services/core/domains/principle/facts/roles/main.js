const deps = require("./deps");

module.exports = async ({ context, query }) => {
  const aggregate = await deps
    .eventStore({
      domain: "principle",
      service: "core"
    })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .aggregate(query.root);

  if (!aggregate)
    throw deps.badRequestError.message("This principle doesn't exist.");

  const roles = aggregate.state.roles.filter(
    role => role.network == context.network
  );

  return roles;
};
