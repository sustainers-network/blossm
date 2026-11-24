// A principal listed more than once is added once, with all of its listed roles.
export default async (payload) => ({
  principals: Object.values(
    payload.principals.reduce((principals, principal) => {
      const key = `${principal.root}:${principal.service}:${principal.network}`;
      principals[key] = {
        roles: [
          ...new Set([...(principals[key]?.roles || []), ...principal.roles]),
        ],
        root: principal.root,
        service: principal.service,
        network: principal.network,
      };
      return principals;
    }, {})
  ),
});
