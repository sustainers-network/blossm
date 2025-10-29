import deps from "./deps.js";

export default async ({ payload, context, commandFn }) => {
  // Make a root for the new scene.
  const sceneRoot = deps.uuid();
  
  const group = {
    root: deps.uuid(),
    service: process.env.SERVICE,
    network: process.env.NETWORK,
  }

  // Get the principal from the session's context, or make a new one.
  const principal = context.principal || {
    root: deps.uuid(),
    service: process.env.SERVICE,
    network: process.env.NETWORK,
  };

  // Give the principal admin privileges to this scene, if specified.
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
        ]
      : []),
    // Register the scene.
    {
      action: "register",
      root: sceneRoot,
      payload: {
        subject: payload.subject,
        group: group
      },
      groupsAdded: [group],
      correctNumber: 0,
    },
    // Add the principal to the group. 
    {
      domain: "group",
      service: group.service,
      network: group.network,
      action: "add-principals",
      root: group.root,
      payload: {
        principals: [
          {
            roles: ["GroupAdmin"],
            root: principal.root,
            service: principal.service,
            network: principal.network,
          },
        ],
      },
    },
  ];

  const response = {
    receipt: {
      scene: {
        root: sceneRoot,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
      group
    },
  };

  // If the session already has a principal, or no role was added, no need to upgrade it.
  // TODO im not sure the reason for not upgrading based on "role".
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
