module.exports = async ({ payload, root, aggregateFn }) => {
  const existingRoles = [];
  const principalAggregate = await aggregateFn(root);

  for (const role of payload.roles) {
    if (
      (principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.subject.root == role.subject.root &&
          r.subject.domain == role.subject.domain &&
          r.subject.service == role.subject.service &&
          r.subject.network == role.subject.network &&
          !payload.subjects.some(
            (s) =>
              s.root == r.subject.root &&
              s.domain == r.subject.domain &&
              s.service == r.subject.service &&
              s.network == r.subject.network
          )
      )
    )
      existingRoles.push(role);
  }

  for (const subject of payload.subjects) {
    for (const role of principalAggregate.state.roles || []) {
      if (
        role.subject.root == subject.root &&
        role.subject.domain == subject.domain &&
        role.subject.service == subject.service &&
        role.subject.network == subject.network
      )
        existingRoles.push(role);
    }
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
