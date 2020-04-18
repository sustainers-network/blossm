const deps = require("./deps");

const getEventsForPermissionsMerge = async ({
  principle,
  context,
  identityRoot,
  aggregateFn,
}) => {
  // Get the aggregates of the principle of the identity and the current principle of the session.
  const [
    { aggregate: principleAggregate },
    { aggregate: sessionPrincipleAggregate } = {},
  ] = await Promise.all([
    aggregateFn(principle.root, {
      domain: "principle",
    }),
    ...(context.principle
      ? [
          aggregateFn(context.principle.root, {
            domain: "principle",
            service: context.principle.service,
            network: context.principle.network,
          }),
        ]
      : []),
  ]);

  return {
    identityRoot,
    events: [
      ...(sessionPrincipleAggregate &&
      deps.difference(principleAggregate.roles, sessionPrincipleAggregate.roles)
        .length > 0
        ? [
            {
              domain: "principle",
              service: process.env.SERVICE,
              action: "add-roles",
              root: principle.root,
              payload: {
                roles: sessionPrincipleAggregate.roles,
              },
            },
          ]
        : []),
    ],
    principle,
  };
};

const getEventsForIdentityRegistering = async ({ context, payload }) => {
  const identityRoot = deps.uuid();
  const hashedPhone = await deps.hash(payload.phone);

  const principle = context.principle
    ? context.principle
    : {
        root: deps.uuid(),
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      };

  return {
    identityRoot,
    events: [
      {
        action: "register",
        domain: "identity",
        service: process.env.SERVICE,
        root: identityRoot,
        payload: {
          phone: hashedPhone,
          id: payload.id,
          principle,
        },
      },
      {
        action: "add-roles",
        domain: "principle",
        service: process.env.SERVICE,
        root: principle.root,
        payload: {
          roles: [
            {
              id: "IdentityAdmin",
              root: identityRoot,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
          ],
        },
      },
    ],
    principle,
  };
};

module.exports = async ({ payload, context, claims, aggregateFn }) => {
  // Check to see if there is an identity with the provided id.
  const [identity] = await deps
    .eventStore({
      domain: "identity",
    })
    .set({ context, claims, tokenFns: { internal: deps.gcpToken } })
    .query({ key: "id", value: payload.id });

  if (identity) {
    if (!(await deps.compare(payload.phone, identity.state.phone)))
      throw deps.invalidArgumentError.message("This phone number isn't right.");

    if (context.principle) {
      // Don't log an event or issue a challange if
      // the context already has the identity's principle.
      if (
        identity.state.principle.root == context.principle.root &&
        identity.state.principle.service == context.principle.service &&
        identity.state.principle.network == context.principle.network
      )
        return {};

      const [subjectIdentity] = await deps
        .eventStore({
          domain: "identity",
        })
        .set({ context, claims, tokenFns: { internal: deps.gcpToken } })
        .query({ key: "principle.root", value: context.principle.root });

      if (subjectIdentity)
        throw deps.badRequestError.message(
          "The session is already saved to a different identity."
        );
    }
  }

  // If an identity is found, merge the roles given to the principle already in the context;
  // to the identity's principle.
  // If not found, register a new identity and set the principle to be the principle in the context.
  const { events, principle, identityRoot } = identity
    ? await getEventsForPermissionsMerge({
        principle: identity.state.principle,
        identityRoot: identity.headers.root,
        context,
        aggregateFn,
      })
    : await getEventsForIdentityRegistering({
        context,
        payload,
      });

  const { tokens } = await deps
    .command({
      name: "issue",
      domain: "challenge",
    })
    .set({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    })
    .issue(
      {
        id: payload.id,
        phone: payload.phone,
      },
      {
        options: {
          events,
          upgrade: {
            identity: {
              root: identityRoot,
              service: process.env.SERVICE,
              network: process.env.NETWORK,
            },
            ...(!context.principle && {
              principle,
            }),
          },
        },
      }
    );

  return { response: { tokens } };
};
