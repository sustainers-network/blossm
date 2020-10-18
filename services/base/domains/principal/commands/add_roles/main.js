module.exports = async ({ payload, root, aggregateFn }) => {
  const nonDuplicatedRoles = [];
  const principalAggregate = await aggregateFn(root);
  for (const role of payload.roles) {
    if (
      !(principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.subject.root == role.subject.root &&
          r.subject.service == role.subject.service &&
          r.subject.network == role.subject.network
      )
    )
      nonDuplicatedRoles.push(role);
  }
  if (nonDuplicatedRoles.length == 0) return;

  return {
    events: [
      {
        action: "add-roles",
        payload: {
          roles: [
            ...nonDuplicatedRoles.map((role) => {
              return {
                id: role.id,
                subject: {
                  root: role.subject.root,
                  domain: role.subject.domain,
                  service: role.subject.service,
                  network: role.subject.network,
                },
              };
            }),
          ],
        },
        root,
      },
    ],
  };
};
