// A principal listed more than once is removed once.
export default async (payload) => ({
  principals: Object.values(
    Object.fromEntries(
      payload.principals.map((principal) => [
        `${principal.root}:${principal.service}:${principal.network}`,
        {
          root: principal.root,
          service: principal.service,
          network: principal.network,
        },
      ])
    )
  ),
});
