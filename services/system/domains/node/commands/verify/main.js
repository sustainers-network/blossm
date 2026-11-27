import deps from "./deps.js";

// A node proves it speaks for the network it registered with by publishing
// its own root in that domain's DNS, which only the domain's owner can do:
//
//   _blossm.<network>  TXT  "blossm-node=<node root>"
export default async ({ context, aggregateFn }) => {
  const node = context.domain == "node" && context.node;

  if (!node)
    throw deps.forbiddenError.message("A node can only be verified by itself.");

  const nodeAggregate = await aggregateFn(node.root);

  // If the node has already been verified, return.
  if (nodeAggregate.state.verified) return;

  const record = `_blossm.${nodeAggregate.state.network}`;
  const value = `blossm-node=${node.root}`;

  // Local networks have no DNS to ask.
  if (process.env.NODE_ENV != "local") {
    // A long TXT value arrives in chunks. No record at all is a failed lookup.
    const found = await deps.resolveTxt(record).catch(() => []);
    if (!found.some((chunks) => chunks.join("") == value))
      throw deps.badRequestError.message(
        "The network's DNS doesn't name this node yet.",
        { info: { record, type: "TXT", value } }
      );
  }

  return {
    events: [
      {
        action: "verify",
        root: node.root,
        correctNumber: nodeAggregate.lastEventNumber + 1,
        payload: { verified: deps.stringDate() },
      },
    ],
  };
};
