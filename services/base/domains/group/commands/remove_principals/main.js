const deps = require("./deps");

//TODO make sure requesting principal has permissions.
module.exports = async ({
  context,
  payload,
  root,
  aggregateFn,
  readFactFn,
}) => {
  const existingPrincipals = [];
  const groupAggregate = await aggregateFn(root);
  if (!groupAggregate.state.networks.includes(context.network))
    throw deps.forbiddenError.message("This group isn't accessible.");

  for (const principal of payload.principals) {
    if (
      groupAggregate.state.principals.some(
        (p) =>
          p.root == principal.root &&
          p.service == principal.service &&
          p.network == principal.network
      )
    )
      existingPrincipals.push(principal);
  }
  if (existingPrincipals.length == 0) return;

  const rolesByPrincipal = {};
  await Promise.all(
    existingPrincipals.map(async (principal) => {
      const { body: roles } = await readFactFn({
        name: "roles",
        domain: "principal",
        service: "base",
        context: {
          principal,
        },
        query: {
          includes: [
            {
              root,
              domain: process.env.DOMAIN,
              service: process.env.SERVICE,
            },
          ],
        },
      });
      rolesByPrincipal[principal.root] = roles;
    })
  );

  return {
    events: [
      ...existingPrincipals.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "remove-roles",
        root: principal.root,
        payload: {
          roles: rolesByPrincipal[principal.root],
        },
      })),
      ...existingPrincipals.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "remove-groups",
        root: principal.root,
        payload: {
          groups: [
            {
              root,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
        },
      })),
      {
        action: "remove-principals",
        root,
        payload: {
          principals: existingPrincipals.map((principal) => ({
            root: principal.root,
            service: principal.service,
            network: principal.network,
          })),
        },
      },
    ],
  };
};
