module.exports = async ({ payload, root, aggregateFn }) => {
  const existingRoles = [];
  const principalAggregate = await aggregateFn(root);
  for (const role of payload.roles) {
    if (
      (principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.root == role.root &&
          r.domain == role.domain &&
          r.service == role.service &&
          r.network == role.network
      )
    )
      existingRoles.push(role);
  }

  if (existingRoles.length == 0) return;

  return {
    events: [
      {
        action: "remove-roles",
        payload: {
          roles: [
            ...existingRoles.map((role) => {
              return {
                id: role.id,
                root: role.root,
                domain: role.domain,
                service: role.service,
                network: role.network,
              };
            }),
          ],
        },
        root,
      },
    ],
  };
};
