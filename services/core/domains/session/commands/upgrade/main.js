const deps = require("./deps");

module.exports = async ({ payload, context, claims, aggregateFn }) => {
  // If there's nothing to upgrade to, dont save events.
  if (!Object.keys(payload).length) return {};

  // Get the aggregate for this session.
  const { aggregate: sessionAggregate } = await aggregateFn(
    context.session.root
  );

  // Check to see if this session has already been terminated.
  if (sessionAggregate.terminated)
    throw deps.badRequestError.message("This session is terminated.");

  const newContext = {
    ...context,
    ...payload,
  };

  const subject = claims.sub || payload.principal.root;

  // Create a new token inheriting from the current claims.
  const token = await deps.createJwt({
    options: {
      issuer: claims.iss,
      subject,
      audience: claims.aud,
      expiresIn: Date.parse(claims.exp) - deps.fineTimestamp(),
    },
    payload: {
      context: newContext,
    },
    signFn: (message) =>
      deps.sign({
        message,
        ring: "jwt",
        key: "access",
        location: "global",
        version: "1",
        project: process.env.GCP_PROJECT,
      }),
  });

  return {
    events: [
      {
        root: context.session.root,
        action: "upgrade",
        payload,
      },
      ...(payload.principal
        ? [
            {
              root: payload.principal.root,
              domain: "principal",
              action: "add-roles",
              payload: {
                roles: [
                  {
                    id: "SessionAdmin",
                    root: context.session.root,
                    service: context.session.service,
                    network: context.session.network,
                  },
                ],
              },
            },
          ]
        : []),
    ],
    response: {
      tokens: [
        {
          network: context.network || process.env.NETWORK,
          type: "access",
          value: token,
        },
      ],
      context: newContext,
    },
  };
};
