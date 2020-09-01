module.exports = async (payload) => ({
  root: payload.root,
  domain: payload.domain,
  service: payload.service,
  network: payload.network,
});
