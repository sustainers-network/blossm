module.exports = async (payload) => {
  return {
    roles: payload.roles.map((role) => {
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
  };
};
