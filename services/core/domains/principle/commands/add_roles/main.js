module.exports = async ({ payload, root, context }) => {
  return {
    events: [
      {
        action: "add-roles",
        payload: {
          roles: [
            ...payload.roles.map(role => {
              return {
                id: role.id,
                root: role.root,
                service: role.service,
                network: context.network
              };
            })
          ]
        },
        root
      }
    ]
  };
};
