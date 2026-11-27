import deps from "./deps.js";

const same = (a, b) =>
  a.root == b.root && a.service == b.service && a.network == b.network;

// The roles a principal holds for this group.
const groupRoles = async ({ principal, root, aggregateFn }) => {
  const principalAggregate = await aggregateFn(principal.root, {
    domain: "principal",
    notFoundThrows: false,
  });

  return ((principalAggregate && principalAggregate.state.roles) || []).filter(
    (role) =>
      role.subject.root == root &&
      role.subject.domain == "group" &&
      role.subject.service == process.env.SERVICE &&
      role.subject.network == process.env.NETWORK
  );
};

export default async ({ context, payload, root, aggregateFn }) => {
  // Get the group's aggregate.
  const groupAggregate = await aggregateFn(root);
  const members = groupAggregate.state.principals || [];

  // Make sure the session context's network has access to the group's network.
  if (!(groupAggregate.state.networks || []).includes(context.network))
    throw deps.forbiddenError.message("This group isn't accessible.");

  // Make sure the calling principal is a member of the group.
  if (!members.some((p) => same(p, context.principal)))
    throw deps.forbiddenError.message("This group isn't accessible.");

  const isAdmin = (
    await groupRoles({ principal: context.principal, root, aggregateFn })
  ).some((role) => role.id == "GroupAdmin");

  // Only an admin removes other members.
  if (!isAdmin && payload.principals.some((p) => !same(p, context.principal)))
    throw deps.forbiddenError.message("This group isn't accessible.");

  // A member can leave, but an admin has to be removed by another admin,
  // so a group always keeps one.
  if (isAdmin && payload.principals.some((p) => same(p, context.principal)))
    throw deps.forbiddenError.message(
      "Another admin has to remove you from this group."
    );

  // Filter for principals associated with the group.
  const existingPrincipals = payload.principals.filter((principal) =>
    members.some((p) => same(p, principal))
  );

  // If there are no principals to remove, return.
  if (!existingPrincipals.length) return;

  return {
    events: [
      // Remove the roles that apply to this group from each principal being removed.
      ...existingPrincipals.map((principal) => ({
        domain: "principal",
        service: process.env.SERVICE,
        network: process.env.NETWORK,
        action: "remove-roles",
        root: principal.root,
        // Every role for this group, held or not: a role granted while this
        // command runs would otherwise outlive the membership.
        payload: {
          roles: ["GroupAdmin", "GroupMember"].map((id) => ({
            id,
            subject: {
              root,
              domain: "group",
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          })),
        },
      })),

      // Remove the principals from this group. The event has to land on the
      // group's next number, so of two removals read from the same state only
      // one is written, and the other writes nothing, roles included. Two
      // admins can't remove each other at once.
      {
        action: "remove-principals",
        root,
        correctNumber: groupAggregate.lastEventNumber + 1,
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
