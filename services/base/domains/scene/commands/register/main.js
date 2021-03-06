const deps = require("./deps");

module.exports = async ({ payload, context, commandFn }) => {
  const sceneRoot = deps.uuid();

  // Determine what root should be used for the principal.
  const principal = context.principal || {
    root: deps.uuid(),
    service: process.env.SERVICE,
    network: process.env.NETWORK,
  };

  // Give the principal admin privileges to this context.
  const events = [
    ...(payload.role
      ? [
          {
            domain: "principal",
            service: principal.service,
            network: principal.network,
            action: "add-roles",
            root: principal.root,
            payload: {
              roles: [
                {
                  id: payload.role,
                  subject: {
                    root: sceneRoot,
                    domain: "scene",
                    service: process.env.SERVICE,
                    network: process.env.NETWORK,
                  },
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
        ]
      : []),
    {
      action: "register",
      root: sceneRoot,
      payload: {
        root: payload.root,
        domain: payload.domain,
        service: payload.service,
        network: payload.network,
      },
      correctNumber: 0,
    },
  ];

  const response = {
    receipt: {
      scene: {
        root: sceneRoot,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
  };

  // If the session already has a principal, or no role was added, no need to upgrade it.
  if (context.principal || !payload.role) return { events, response };

  // Upgrade the session for the principal.
  const {
    body: { _tokens, context: newContext },
  } = await commandFn({
    domain: "session",
    name: "upgrade",
    payload: {
      principal,
    },
  });

  return {
    events,
    response: {
      ...response,
      receipt: { ...response.receipt, principal },
      context: newContext,
    },
    tokens: _tokens,
  };
};
