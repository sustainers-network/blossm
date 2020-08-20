module.exports = async ({ payload, root, aggregateFn }) => {
  const nonDuplicatedRoles = [];
  const principalAggregate = await aggregateFn(root);
  for (const role of payload.roles) {
    if (
      !(principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.root == role.root &&
          r.service == role.service &&
          r.network == role.network
      )
    )
      nonDuplicatedRoles.push(role);
  }
  if (nonDuplicatedRoles.length == 0) return {};

  return {
    events: [
      {
        action: "add-roles",
        payload: {
          roles: [
            ...nonDuplicatedRoles.map((role) => {
              return {
                id: role.id,
                root: role.root,
                service: role.service,
                network: role.network || process.env.NETWORK,
              };
            }),
          ],
        },
        root,
      },
    ],
  };
};
