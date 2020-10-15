module.exports = (payload) => ({
  name: payload.name,
  roles: [...new Set(payload.roles)],
});
