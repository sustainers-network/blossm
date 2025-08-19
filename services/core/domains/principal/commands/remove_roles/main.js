export default async ({ payload, root, aggregateFn }) => {

  // Get the principal's aggregate.
  const principalAggregate = await aggregateFn(root);
  
  // Filter for roles that are associated with this principal.
  const rolesToRemove = [];
  
  // Remove the roles specified in the payload.
  for (const role of payload.roles) {
    if (
      (principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.subject.root == role.subject.root &&
          r.subject.domain == role.subject.domain &&
          r.subject.service == role.subject.service &&
          r.subject.network == role.subject.network &&
          // We'll remove roles for given subjects next.
          !payload.subjects.some(
            (s) =>
              s.root == r.subject.root &&
              s.domain == r.subject.domain &&
              s.service == r.subject.service &&
              s.network == r.subject.network
          )
      )
    )
    rolesToRemove.push(role);
  }
  
  // Remove roles for the subjects specified in the payload.
  for (const subject of payload.subjects) {
    for (const role of principalAggregate.state.roles || []) {
      if (
        role.subject.root == subject.root &&
        role.subject.domain == subject.domain &&
        role.subject.service == subject.service &&
        role.subject.network == subject.network
      )
      rolesToRemove.push(role);
    }
  }

  // If there are no roles to remove, return.
  if (!rolesToRemove.length) return;

  return {
    events: [
      // Remove the roles from the principal.
      {
        action: "remove-roles",
        payload: {
          roles: [
            ...rolesToRemove.map((role) => ({
                id: role.id,
                subject: {
                  root: role.subject.root,
                  domain: role.subject.domain,
                  service: role.subject.service,
                  network: role.subject.network,
                },
              })
            ),
          ],
        },
        root,
      },
    ],
  };
};
