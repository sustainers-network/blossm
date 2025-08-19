export default async (payload) => ({
    roles: payload.roles.map((role) => ({
        id: role.id,
        subject: {
          root: role.subject.root,
          domain: role.subject.domain,
          service: role.subject.service,
          network: role.subject.network,
        },
      })
    ),
  });
