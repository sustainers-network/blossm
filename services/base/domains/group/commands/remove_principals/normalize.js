module.exports = async (payload) => ({
  principals: payload.principals.map((principal) => ({
    role: principal.role,
    root: principal.root,
    service: principal.service,
    network: principal.network,
  })),
});
