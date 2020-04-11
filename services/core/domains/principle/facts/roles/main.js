const deps = require("./deps");

module.exports = async ({ context, root }) => {
  //TODO
  //eslint-disable-next-line no-console
  console.log({ root, context });
  const aggregate = await deps
    .eventStore({
      domain: "principle",
      service: "core"
    })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .aggregate(root);

  if (!aggregate)
    throw deps.badRequestError.message("This principle doesn't exist.");

  //TODO
  //eslint-disable-next-line no-console
  console.log({ roles: aggregate.state.roles, context });

  const roles = aggregate.state.roles.filter(
    role => role.network == context.network
  );

  return roles;
};
