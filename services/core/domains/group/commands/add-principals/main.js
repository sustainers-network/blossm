const deps = require("./deps");

const principalLimit = 100;

module.exports = async ({ context, payload, root, aggregateFn }) => {
  const nonDuplicatedPrincipals = [];
  if (root) {
    const groupAggregate = await aggregateFn(root);
    if (!groupAggregate.state.networks.includes(context.network))
      throw deps.forbiddenError.message("This group isn't accessible.");

    if (
      groupAggregate.state.principals.length + payload.principals.length >
      principalLimit
    )
      throw deps.badRequestError.message(
        `A group has a max size of ${principalLimit}`,
        {
          info: {
            currentCount: groupAggregate.state.principals.length,
          },
        }
      );

    for (const principal of payload.principals) {
      if (
        !groupAggregate.state.principals.some(
          (p) =>
            p.root == principal.root &&
            p.service == principal.service &&
            p.network == principal.network
        )
      )
        nonDuplicatedPrincipals.push(principal);
    }
    if (nonDuplicatedPrincipals.length == 0) return;
  } else {
    if (payload.principals.length > principalLimit)
      throw deps.badRequestError.message(
        `A group has a max size of ${principalLimit}`,
        {
          info: {
            currentCount: 0,
          },
        }
      );
    nonDuplicatedPrincipals.push(...payload.principals);
  }

  const groupRoot = root || deps.uuid();

  return {
    events: [
      ...nonDuplicatedPrincipals.map((principal) => ({
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
      ...nonDuplicatedPrincipals.map((principal) => ({
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
          principals: nonDuplicatedPrincipals.map((principal) => ({
            root: principal.root,
            service: principal.service,
            network: principal.network,
          })),
        },
      },
      ...(groupRoot != root
        ? [
            {
              action: "add-networks",
              root: groupRoot,
              payload: {
                networks: [context.network],
              },
            },
          ]
        : []),
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
