module.exports = async ({ payload, root }) => {
  return {
    events: [
      {
        action: "add-roles",
        payload: {
          roles: [
            ...payload.roles.map((role) => {
              return {
                id: role.id,
                root: role.root,
                service: role.service,
                network: role.network || process.env.NETWORK,
              };
            }),
          ],
        },
        root,
      },
    ],
  };
};
