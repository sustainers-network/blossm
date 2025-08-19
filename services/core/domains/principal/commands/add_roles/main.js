export default async ({ payload, root, aggregateFn }) => {
  // Get the principal's aggregate.
  const principalAggregate = await aggregateFn(root);
  
  // Filter for the roles that do not yet belong to this principal.
  const rolesToAdd = [];
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
    rolesToAdd.push(role);
  }

  // If there are no roles to add, return.
  if (!rolesToAdd.length) return;

  return {
    events: [
      // Add the roles to the principal.
      {
        action: "add-roles",
        payload: {
          roles: [
            ...rolesToAdd.map((role) => ({
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
