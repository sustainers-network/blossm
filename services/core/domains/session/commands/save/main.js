const deps = require("./deps");

const getEventsForPermissionsMerge = async ({
  principal,
  context,
  identityRoot,
  aggregateFn,
}) => {
  // Get the aggregates of the principal of the identity and the current principal of the session.
  const [
    { aggregate: principalAggregate },
    { aggregate: sessionprincipalAggregate } = {},
  ] = await Promise.all([
    aggregateFn(principal.root, {
      domain: "principal",
    }),
    ...(context.principal
      ? [
          aggregateFn(context.principal.root, {
            domain: "principal",
            service: context.principal.service,
            network: context.principal.network,
          }),
        ]
      : []),
  ]);

  return {
    identityRoot,
    events: [
      ...(sessionprincipalAggregate &&
      deps.difference(principalAggregate.roles, sessionprincipalAggregate.roles)
        .length > 0
        ? [
            {
              domain: "principal",
              service: process.env.SERVICE,
              action: "add-roles",
              root: principal.root,
              payload: {
                roles: sessionprincipalAggregate.roles,
              },
            },
          ]
        : []),
    ],
    principal,
  };
};

const getEventsForIdentityRegistering = async ({ context, payload }) => {
  const identityRoot = deps.uuid();
  const hashedPhone = await deps.hash(payload.phone);

  const principal = context.principal
    ? context.principal
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
          ...(deps.emailValidator(payload.id) && { email: payload.id }),
          id: payload.id,
          principal,
        },
      },
      {
        action: "add-roles",
        domain: "principal",
        service: process.env.SERVICE,
        root: principal.root,
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
    principal,
  };
};

module.exports = async ({
  payload,
  context,
  commandFn,
  aggregateFn,
  queryAggregatesFn,
}) => {
  // Check to see if there is an identity with the provided id.
  const { body: [identity] = [] } = await queryAggregatesFn({
    domain: "identity",
    key: "id",
    value: payload.id,
  });

  if (identity) {
    if (!(await deps.compare(payload.phone, identity.state.phone)))
      throw deps.invalidArgumentError.message("This phone number isn't right.");

    if (context.principal) {
      // Don't log an event or issue a challange if
      // the context already has the identity's principal.
      if (
        identity.state.principal.root == context.principal.root &&
        identity.state.principal.service == context.principal.service &&
        identity.state.principal.network == context.principal.network
      )
        return {};

      const { body: [subjectIdentity] = [] } = await queryAggregatesFn({
        domain: "identity",
        key: "principal.root",
        value: context.principal.root,
      });

      if (subjectIdentity)
        throw deps.badRequestError.message(
          "The session is already saved to a different identity."
        );
    }
  }

  // If an identity is found, merge the roles given to the principal already in the context;
  // to the identity's principal.
  // If not found, register a new identity and set the principal to be the principal in the context.
  const { events, principal, identityRoot } = identity
    ? await getEventsForPermissionsMerge({
        principal: identity.state.principal,
        identityRoot: identity.root,
        context,
        aggregateFn,
      })
    : await getEventsForIdentityRegistering({
        context,
        payload,
      });

  const {
    body: { tokens },
    statusCode,
  } = await commandFn({
    name: "issue",
    domain: "challenge",
    payload: {
      id: payload.id,
      phone: payload.phone,
    },
    options: {
      events,
      upgrade: {
        identity: {
          root: identityRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
        ...(!context.principal && {
          principal,
        }),
      },
    },
  });

  return { response: { tokens }, statusCode };
};
