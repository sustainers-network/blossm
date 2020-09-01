module.exports = async (payload) => ({
  principals: payload.principals.map((principal) => ({
    roles: principal.roles,
    root: principal.root,
    service: principal.service,
    network: principal.network,
  })),
});
