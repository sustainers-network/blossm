const deps = require("./deps");

module.exports = async ({ payload, context, claims }) => {
  const sceneRoot = deps.uuid();

  // Determine what root should be used for the principle.
  const principle = context.principle || {
    root: deps.uuid(),
    service: process.env.SERVICE,
    network: process.env.NETWORK,
  };

  // Give the principle admin privileges to this context.
  const events = [
    {
      domain: "principle",
      service: principle.service,
      network: principle.network,
      action: "add-roles",
      root: principle.root,
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
      domain: "principle",
      service: principle.service,
      network: principle.network,
      action: "add-scenes",
      root: principle.root,
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
    {
      action: "register",
      root: sceneRoot,
      payload,
      correctNumber: 0,
    },
  ];

  const response = {
    references: {
      principle,
      scene: {
        root: sceneRoot,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
  };

  // If the session already has a principle, no need to upgrade it.
  if (context.principle) return { events, response };

  // Upgrade the session for the principle.
  const {
    body: { tokens, context: newContext },
  } = await deps
    .command({
      domain: "session",
      name: "upgrade",
    })
    .set({ context, claims, tokenFns: { internal: deps.gcpToken } })
    .issue({ principle });

  return { events, response: { ...response, tokens, context: newContext } };
};
