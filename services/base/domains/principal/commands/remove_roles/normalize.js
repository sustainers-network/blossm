module.exports = async (payload) => {
  return {
    roles: (payload.roles || []).map((role) => ({
      id: role.id,
      subject: {
        root: role.subject.root,
        domain: role.subject.domain,
        service: role.subject.service,
        network: role.subject.network,
      },
    })),
    subjects: (payload.subjects || []).map((subject) => ({
      root: subject.root,
      domain: subject.domain,
      service: subject.service,
      network: subject.network,
    })),
  };
};
