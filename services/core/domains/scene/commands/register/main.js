const deps = require("./deps");

module.exports = async ({ payload, context, claims }) => {
  const sceneRoot = deps.uuid();

  // Determine what root should be used for the principal.
  const principal = context.principal || {
    root: deps.uuid(),
    service: process.env.SERVICE,
    network: process.env.NETWORK,
  };

  // Give the principal admin privileges to this context.
  const events = [
    {
      domain: "principal",
      service: principal.service,
      network: principal.network,
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
    {
      action: "register",
      root: sceneRoot,
      payload,
      correctNumber: 0,
    },
  ];

  const response = {
    references: {
      scene: {
        root: sceneRoot,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
  };

  // If the session already has a principal, no need to upgrade it.
  if (context.principal) return { events, response };

  // Upgrade the session for the principal.
  const {
    body: { tokens, context: newContext },
  } = await deps
    .command({
      domain: "session",
      name: "upgrade",
    })
    .set({ context, claims, token: { internalFn: deps.gcpToken } })
    .issue({ principal });

  return {
    events,
    response: {
      ...response,
      references: { ...response.references, principal },
      tokens,
      context: newContext,
    },
  };
};
