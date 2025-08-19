import deps from "./deps.js";

//TODO make sure requesting principal has permissions. GroupAdmin.
export default async ({
  context,
  payload,
  root,
  aggregateFn,
  readFactFn,
}) => {

  // Get the group's aggregate.
  const groupAggregate = await aggregateFn(root);
  
  // Make sure the session context's network has access to the group's network.
  if (!groupAggregate.state.networks.includes(context.network))
    throw deps.forbiddenError.message("This group isn't accessible.");

  // Filter for principals associated with the group.
  const existingPrincipals = [];
  
  // Get principals in the group.
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

  // If there are no principals to remove, return.
  if (!existingPrincipals.length) return;


  // Get roles that apply to this group for each principal.
  const rolesByPrincipal = {};
  await Promise.all(
    existingPrincipals.map(async (principal) => {
      const { body: roles } = await readFactFn({
        name: "roles",
        domain: "principal",
        service: "core",
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

      // Remove the roles that apply to this group from each principal being removed.
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

      // Remove the group from each principal being removed.
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

      // Remove the principals from this group.
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
