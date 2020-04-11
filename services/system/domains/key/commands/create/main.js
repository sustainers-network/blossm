const deps = require("./deps");

module.exports = async ({ payload, context, aggregateFn }) => {
  const node = context.domain == "node" && context.node;

  if (!node)
    throw deps.forbiddenError.message("A key can only be made by a node.");

  const secret = deps.randomStringOfLength(40);

  const [hash, { aggregate: nodeAggregate }] = await Promise.all([
    deps.hash(secret),
    aggregateFn(node.root, {
      domain: "node",
      service: node.service,
      network: node.network
  })]);

  const keyRoot = deps.uuid();
  const principleRoot = deps.uuid();

  return {
    events: [
      {
        domain: "principle",
        service: "core",
        action: "add-roles",
        payload: {
          roles: payload.roles.map(role => {
            return {
              id: role,
              root: "some-tmp-root",
              service: process.env.SERVICE,
              network: process.env.NETWORK
            };
          })
        },
        root: principleRoot
      },
      {
        action: "create",
        payload: {
          name: payload.name,
          network: nodeAggregate.network,
          node,
          principle: {
            root: principleRoot,
            service: "core",
            network: process.env.NETWORK
          },
          secret: hash
        },
        root: keyRoot,
        correctNumber: 0
      }
    ],
    response: { root: keyRoot, secret }
  };
};
