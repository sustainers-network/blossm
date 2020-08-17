const deps = require("./deps");

module.exports = async ({ context, payload, root, aggregateFn }) => {
  if (root) {
    const groupAggregate = await aggregateFn(root);
    if (!groupAggregate.state.networks.includes(context.network))
      throw deps.forbiddenError.message("This group isn't accessible.");
  }

  const groupRoot = root || deps.uuid();

  //TODO add principal limit of 100 per network.
  return {
    events: [
      ...payload.principals.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "add-roles",
        root: principal.root,
        payload: {
          roles: [
            {
              id: principal.role,
              root: groupRoot,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
        },
      })),
      ...payload.principals.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "add-groups",
        root: principal.root,
        payload: {
          groups: [
            {
              root: groupRoot,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
        },
      })),
      {
        action: "add-principals",
        root: groupRoot,
        payload: {
          principals: payload.principals.map((principal) => ({
            root: principal.root,
            service: principal.service,
            network: principal.network,
          })),
        },
      },
    ],
    response: {
      ...(groupRoot != root && {
        receipt: {
          group: {
            root: groupRoot,
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        },
      }),
    },
  };
};
