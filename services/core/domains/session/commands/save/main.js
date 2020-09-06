const deps = require("./deps");

const mergeGroups = async ({
  sessionPrincipalAggregate,
  principalAggregate,
  principal,
  commandFn,
}) => {
  const groupCommandFns = [];
  deps
    .difference(
      sessionPrincipalAggregate.state.groups.map(
        (group) => `${group.root}:${group.service}:${group.network}`
      ),
      principalAggregate.state.groups.map(
        (group) => `${group.root}:${group.service}:${group.network}`
      )
    )
    .forEach((groupString) => {
      const [root, service, network] = groupString.split(":");
      const roles = sessionPrincipalAggregate.state.roles.filter(
        (role) =>
          role.subject.root == root &&
          role.subject.domain == "group" &&
          role.subject.service == service &&
          role.subject.network == network
      ) || [null];

      if (roles.length == 0) return;

      groupCommandFns.push(
        commandFn({
          name: "add-principals",
          domain: "group",
          service,
          root,
          async: true,
          payload: {
            principals: [
              {
                roles: roles.map((role) => role.id),
                root: principal.root,
                service: principal.service,
                network: principal.network,
              },
            ],
          },
        })
      );
    });

  await Promise.all(groupCommandFns);
};
const getEventsForPermissionsMerge = async ({
  principal,
  context,
  identityRoot,
  aggregateFn,
  commandFn,
}) => {
  // Get the aggregates of the principal of the identity and the current principal of the session.
  const [principalAggregate, sessionPrincipalAggregate] = await Promise.all([
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

  if (sessionPrincipalAggregate) {
    await mergeGroups({
      sessionPrincipalAggregate,
      principalAggregate,
      principal,
      commandFn,
    });
  }

  return {
    identityRoot,
    events: [
      ...(sessionPrincipalAggregate
        ? deps.difference(
            principalAggregate.state.roles
              .filter((role) => role.domain != "group")
              .map(
                (role) =>
                  `${role.id}:${role.root}:${role.domain}:${role.service}:${role.network}`
              ),
            sessionPrincipalAggregate.state.roles
              .filter((role) => role.domain != "group")
              .map(
                (role) =>
                  `${role.id}:${role.root}:${role.domain}:${role.service}:${role.network}`
              )
          ).length > 0
          ? [
              {
                domain: "principal",
                service: process.env.SERVICE,
                action: "add-roles",
                root: principal.root,
                payload: {
                  roles: sessionPrincipalAggregate.state.roles.filter(
                    (role) => role.subject.domain != "group"
                  ),
                },
              },
            ]
          : []
        : []),
      ...(sessionPrincipalAggregate
        ? sessionPrincipalAggregate.state.groups.map((group) => ({
            domain: "group",
            service: group.service,
            action: "remove-principals",
            root: group.root,
            payload: {
              principals: [context.principal],
            },
          }))
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
          normalizedId: payload.id.toLowerCase(),
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
              subject: {
                root: identityRoot,
                domain: "identity",
                service: process.env.SERVICE,
                network: process.env.NETWORK,
              },
            },
          ],
        },
      },
    ],
    principal,
    receipt: {
      identity: {
        root: identityRoot,
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      },
    },
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
  const [identity] = await queryAggregatesFn({
    domain: "identity",
    key: "normalizedId",
    value: payload.id.toLowerCase(),
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
        return;

      const [subjectIdentity] = await queryAggregatesFn({
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
  const {
    events,
    principal,
    identityRoot,
    receipt: { identity: receiptIdentity } = {},
  } = identity
    ? await getEventsForPermissionsMerge({
        principal: identity.state.principal,
        identityRoot: identity.root,
        context,
        aggregateFn,
        commandFn,
      })
    : await getEventsForIdentityRegistering({
        context,
        payload,
      });

  const {
    body: {
      tokens,
      receipt: { challenge },
    },
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

  return {
    response: {
      tokens,
      receipt: {
        challenge,
        ...(receiptIdentity && { identity: receiptIdentity }),
      },
    },
    statusCode,
  };
};
