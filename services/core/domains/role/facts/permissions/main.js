const deps = require("./deps");

module.exports = async ({ context, query, queryAggregatesFn }) => {
  const networkRoles = await queryAggregatesFn({
    domain: process.env.DOMAIN,
    key: "network",
    value: context.network,
  });

  const role = networkRoles.find((role) => role.state.id == query.id);

  if (!role)
    throw deps.badRequestError.message(
      "There's no role with this id in this network."
    );

  return { response: role.state.permissions };
};
