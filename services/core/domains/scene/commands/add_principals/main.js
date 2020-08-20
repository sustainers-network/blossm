const deps = require("./deps");

module.exports = async ({ root, payload, context, commandFn }) => {
  // Give the principal admin privileges to this context.
  const events = [
    {
      domain: "principal",
      service: payload.principal.service,
      network: payload.principal.network,
      action: "add-roles",
      root: principal.root,
      payload: {
        roles: [
          {
            id: "SceneAdmin",
            root: sceneRoot,
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        ],
      },
    },
    {
      domain: "principal",
      service: principal.service,
      network: principal.network,
      action: "add-scenes",
      root: principal.root,
      payload: {
        scenes: [
          {
            root: sceneRoot,
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        ],
      },
    },
  ];

  return { events };
};
