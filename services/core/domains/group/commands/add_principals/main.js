import deps from "./deps.js";

const principalLimit = 100;

const same = (a, b) =>
  a.root == b.root && a.service == b.service && a.network == b.network;

// The ids of the roles a principal holds for this group.
const groupRoles = async ({ principal, root, aggregateFn }) => {
  const principalAggregate = await aggregateFn(principal.root, {
    domain: "principal",
    notFoundThrows: false,
  });

  return ((principalAggregate && principalAggregate.state.roles) || [])
    .filter(
      (role) =>
        role.subject.root == root &&
        role.subject.domain == "group" &&
        role.subject.service == process.env.SERVICE &&
        role.subject.network == process.env.NETWORK
    )
    .map((role) => role.id);
};

export default async ({ context, payload, root, aggregateFn }) => {
  // A member always holds a role, and the group store keys a member by
  // "root:service:network", so none of those can be empty or hold a colon.
  if (
    payload.principals.some(
      (p) =>
        !p.roles.length ||
        [p.root, p.service, p.network].some((v) => !v || v.includes(":"))
    )
  )
    throw deps.badRequestError.message(
      "Each principal needs a root, a service, a network and a role."
    );

  // The principals joining the group, and the members gaining a role in it.
  const principalsToAdd = [];
  const principalsToPromote = [];

  if (root) {
    // If we're adding to a group that already exists, get the group's aggregate.
    const groupAggregate = await aggregateFn(root);
    const members = groupAggregate.state.principals || [];

    // Make sure the session's context network can access the group based on its networks.
    if (!(groupAggregate.state.networks || []).includes(context.network))
      throw deps.forbiddenError.message("This group isn't accessible.");

    // Make sure the calling principal is a member of the group and administers it.
    if (
      !members.some((p) => same(p, context.principal)) ||
      !(
        await groupRoles({ principal: context.principal, root, aggregateFn })
      ).includes("GroupAdmin")
    )
      throw deps.forbiddenError.message("This group isn't accessible.");

    for (const principal of payload.principals) {
      if (!members.some((p) => same(p, principal))) {
        principalsToAdd.push(principal);
        continue;
      }
      // A member only gains the roles they don't hold yet.
      const held = await groupRoles({ principal, root, aggregateFn });
      const roles = principal.roles.filter((role) => !held.includes(role));
      if (roles.length) principalsToPromote.push({ ...principal, roles });
    }

    // Make sure the total principals in the group after adding won't exceed the limit.
    if (members.length + principalsToAdd.length > principalLimit)
      throw deps.badRequestError.message(
        `A group has a max size of ${principalLimit}`,
        {
          info: {
            currentCount: members.length,
          },
        }
      );

    // If there is nothing to change, return.
    if (!principalsToAdd.length && !principalsToPromote.length) return;
  } else {
    // A new group always starts with its creator as an admin, so it is never without one.
    const own = payload.principals.find((p) => same(p, context.principal));
    principalsToAdd.push(
      {
        root: context.principal.root,
        service: context.principal.service,
        network: context.principal.network,
        roles: [...new Set(["GroupAdmin", ...(own ? own.roles : [])])],
      },
      ...payload.principals.filter((p) => !same(p, context.principal))
    );

    // Make sure the number of principals doesn't exceed the limit.
    if (principalsToAdd.length > principalLimit)
      throw deps.badRequestError.message(
        `A group has a max size of ${principalLimit}`,
        {
          info: {
            currentCount: 0,
          },
        }
      );
  }

  // Make a new root if needed.
  const groupRoot = root || deps.uuid();

  return {
    events: [
      // Add the roles to the principals. A member always holds a role for the group.
      ...[...principalsToAdd, ...principalsToPromote].map((principal) => ({
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
