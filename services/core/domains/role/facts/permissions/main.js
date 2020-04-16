const deps = require("./deps");

module.exports = async ({ context, query }) => {
  const networkRoles = await deps
    .eventStore({ domain: process.env.DOMAIN })
    .set({ tokenFns: { internal: deps.gcpToken } })
    .query({ key: "network", value: context.network });

  const role = networkRoles.find((role) => role.state.id == query.id);

  if (!role)
    throw deps.badRequestError.message(
      "There's no role with this id in this network."
    );

  return role.state.permissions;
};
