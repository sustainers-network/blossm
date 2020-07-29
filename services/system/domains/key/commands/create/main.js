const deps = require("./deps");

module.exports = async ({ payload, context, aggregateFn }) => {
  const node = context.domain == "node" && context.node;

  if (!node)
    throw deps.forbiddenError.message("A key can only be made by a node.");

  const secret = deps.randomStringOfLength(40);

  const [hash, nodeAggregate] = await Promise.all([
    deps.hash(secret),
    aggregateFn(node.root, {
      domain: "node",
      service: node.service,
      network: node.network,
    }),
  ]);

  const keyRoot = deps.uuid();
  const principalRoot = deps.uuid();

  return {
    events: [
      {
        domain: "principal",
        service: "core",
        action: "add-roles",
        payload: {
          roles: payload.roles.map((role) => {
            return {
              id: role,
              root: "some-tmp-root-TODO",
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            };
          }),
        },
        root: principalRoot,
      },
      {
        action: "create",
        payload: {
          name: payload.name,
          network: nodeAggregate.state.network,
          scene: context.scene,
          principal: {
            root: principalRoot,
            service: "core",
            network: process.env.NETWORK,
          },
          secret: hash,
        },
        root: keyRoot,
      },
    ],
    response: {
      root: keyRoot,
      secret,
      receipt: {
        key: {
          root: keyRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
