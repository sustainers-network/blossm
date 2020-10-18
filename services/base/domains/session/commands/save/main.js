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
  accountRoot,
  aggregateFn,
  commandFn,
}) => {
  // Get the aggregates of the principal of the account and the current principal of the session.
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
    accountRoot,
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

const getEventsForAccountRegistering = async ({
  context,
  payload,
  generateRootFn,
}) => {
  const accountRoot = generateRootFn();
  const hashedPassword = await deps.hash(payload.password);

  const principal = context.principal
    ? context.principal
    : {
        root: generateRootFn(),
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      };

  return {
    accountRoot,
    events: [
      {
        action: "register",
        domain: "account",
        service: process.env.SERVICE,
        root: accountRoot,
        payload: {
          password: hashedPassword,
          email: payload.email,
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
              id: "AccountAdmin",
              subject: {
                root: accountRoot,
                domain: "account",
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
      account: {
        root: accountRoot,
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
  generateRootFn,
}) => {
  // Check to see if there is an account with the provided email.
  const [account] = await queryAggregatesFn({
    domain: "account",
    key: "email",
    value: payload.email,
  });

  if (account) {
    if (!(await deps.compare(payload.password, account.state.password)))
      throw deps.invalidArgumentError.message("This password isn't right.");

    if (context.principal) {
      // Don't log an event or issue a challange if
      // the context already has the account's principal.
      if (
        account.state.principal.root == context.principal.root &&
        account.state.principal.service == context.principal.service &&
        account.state.principal.network == context.principal.network
      )
        return;

      const [principalAccount] = await queryAggregatesFn({
        domain: "account",
        key: "principal.root",
        value: context.principal.root,
      });

      if (principalAccount)
        throw deps.badRequestError.message(
          "The session already belongs to a different account."
        );
    }
  }

  // If an account is found, merge the roles given to the principal already in the context
  // to the account's principal.
  // If not found, register a new account and set the principal to be the principal in the context.
  const {
    events,
    principal,
    accountRoot,
    receipt: { account: receiptAccount } = {},
  } = account
    ? await getEventsForPermissionsMerge({
        principal: account.state.principal,
        accountRoot: account.root,
        context,
        aggregateFn,
        commandFn,
      })
    : await getEventsForAccountRegistering({
        context,
        payload,
        generateRootFn,
      });

  const {
    body: {
      _tokens,
      receipt: { challenge },
    },
    statusCode,
  } = await commandFn({
    name: "issue",
    domain: "challenge",
    payload: {
      email: payload.email,
      password: payload.password,
    },
    options: {
      events,
      upgrade: {
        account: {
          root: accountRoot,
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
      receipt: {
        challenge,
        ...(receiptAccount && { account: receiptAccount }),
      },
    },
    statusCode,
    tokens: _tokens,
  };
};
