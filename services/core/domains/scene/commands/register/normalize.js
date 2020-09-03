module.exports = async (payload) => ({
  ...(payload.role && { role: payload.role }),
  root: payload.root,
  domain: payload.domain,
  service: payload.service,
  network: payload.network,
});
