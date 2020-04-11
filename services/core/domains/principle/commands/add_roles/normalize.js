module.exports = async payload => {
  return {
    roles: payload.roles.map(role => {
      return  {
        id: role.id,
        root: role.root,
        service: role.service
      }
    })
  };
};
