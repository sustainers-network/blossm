module.exports = async (payload) => {
  return {
    name: payload.name,
    roles: [...new Set(payload.roles)],
  };
};
