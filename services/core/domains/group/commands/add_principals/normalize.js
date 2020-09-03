module.exports = async (payload) => ({
  principals: payload.principals.map((principal) => ({
    roles: [...new Set(principal.roles)],
    root: principal.root,
    service: principal.service,
    network: principal.network,
  })),
});
