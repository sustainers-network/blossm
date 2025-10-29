import deps from "./deps.js";

const principalLimit = 100;

export default async ({ context, payload, root, aggregateFn }) => {

  // Get the principals being added to the group.
  const principalsToAdd = [];

  if (root) {
    // If we're adding to a group that already exists, get the group's aggregate.
    const groupAggregate = await aggregateFn(root);

    // Make sure the session's context network can access the group based on its networks. 
    if (!groupAggregate.state.networks.includes(context.network))
      throw deps.forbiddenError.message("This group isn't accessible.");
    
    // Make sure the total principals in the group after adding won't exceed the limit.
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
      
    // Filter for the principals not yet associated with the group.
    for (const principal of payload.principals) {
      if (
        !groupAggregate.state.principals.some(
          (p) =>
            p.root == principal.root &&
            p.service == principal.service &&
            p.network == principal.network
        )
      )
      principalsToAdd.push(principal);
    }

    // If there are no principals to add, return.
    if (!principalsToAdd.length) return;
  } else {
    // If we're making a new group, make sure the number of principals being passed in doesn't exceed the limit.
    if (payload.principals.length > principalLimit)
      throw deps.badRequestError.message(
        `A group has a max size of ${principalLimit}`,
        {
          info: {
            currentCount: 0,
          },
        }
      );
    
    // Add all principals. 
    principalsToAdd.push(...payload.principals);
  }
  
  // Make a new root if needed.
  const groupRoot = root || deps.uuid();

  return {
    events: [
      // Add the roles to the principals.
      ...principalsToAdd.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "add-roles",
        root: principal.root,
        payload: {
          roles: principal.roles.map((role) => ({
            id: role,
            subject: {
              root: groupRoot,
              domain: "group",
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          })),
        },
      })),
      // Add the principals to this group.
      ...(principalsToAdd.length
        ? [
            {
              action: "add-principals",
              root: groupRoot,
              payload: {
                principals: principalsToAdd.map((principal) => ({
                  root: principal.root,
                  service: principal.service,
                  network: principal.network,
                })),
              },
            },
          ]
        : []),
        // If making a new group, add the session context's network to the group.
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
      // If making a new group, add it to the receipt.
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
