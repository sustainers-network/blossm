import deps from "./deps.js";

export default async ({ root, context, aggregateFn }) => {
  const node = context.domain == "node" && context.node;

  if (!node)
    throw deps.forbiddenError.message("A key can only be revoked by its node.");

  const keyAggregate = await aggregateFn(root);
  const owner = keyAggregate.state.domain || {};

  // Make sure the key belongs to the node the session is in.
  if (
    owner.name != "node" ||
    owner.root != node.root ||
    owner.service != node.service ||
    owner.network != node.network
  )
    throw deps.forbiddenError.message("A key can only be revoked by its node.");

  // If the key has already been revoked, return.
  if (keyAggregate.state.revoked) return;

  return {
    events: [
      // Revoke the key. Numbered, so it is written before the command answers.
      {
        action: "revoke",
        root,
        correctNumber: keyAggregate.lastEventNumber + 1,
        payload: { revoked: deps.stringDate() },
      },
      // Take away the only role a key can hold, so a connection token it
      // already opened stops passing the gateways' permission checks.
      {
        domain: "principal",
        service: "core",
        action: "remove-roles",
        root: keyAggregate.state.principal.root,
        payload: {
          roles: [
            {
              id: "NodeNetwork",
              subject: {
                root: node.root,
                domain: "node",
                service: node.service,
                network: node.network,
              },
            },
          ],
        },
      },
    ],
  };
};
