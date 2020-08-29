const deps = require("./deps");

module.exports = async ({ context, payload, root, aggregateFn }) => {
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

  return {
    events: [
      ...existingPrincipals.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "remove-roles",
        root: principal.root,
        payload: {
          roles: [
            {
              id: principal.role,
              root,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
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
