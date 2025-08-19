import deps from "./deps.js";

const mergeGroups = async ({
  sessionPrincipalAggregate,
  principalAggregate,
  principal,
  commandFn,
}) => {
  const groupCommandFns = [];

  // Get the groups that are in the session principal but not in the account principal.
  deps
    .difference(
      sessionPrincipalAggregate.state.groups.map(
        (group) => `${group.root}:${group.service}:${group.network}`
      ),
      principalAggregate.state.groups.map(
        (group) => `${group.root}:${group.service}:${group.network}`
      )
    )
    // For each group, add the principals to the group.
    .forEach((groupString) => {
      const [root, service, network] = groupString.split(":");
      // Get the roles that the session principal has for the groups being added to the account principal.
      const roles = sessionPrincipalAggregate.state.roles.filter(
        (role) =>
          role.subject.root == root &&
          role.subject.domain == "group" &&
          role.subject.service == service &&
          role.subject.network == network
      ); 

      if (!roles.length) return;

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
      // The session principal will be removed from all of its groups in the next step.
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
  // Get the aggregates of the principal of the account and the current principal of the session if one exists.
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
  
  // Merge the session principal's groups into the account principal.
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
      // If there is a session principal,
      // and if the account's principal has roles that differ from the session principal,
      // add any roles that the session principal has that the account's principal doesn't have. 
      // The principal event store will remove duplicates.
      ...(sessionPrincipalAggregate
        ? deps.difference(
            sessionPrincipalAggregate.state.roles
              .filter((role) => role.domain != "group")
              .map(
                (role) =>
                  `${role.id}:${role.root}:${role.domain}:${role.service}:${role.network}`
              ),
            principalAggregate.state.roles
              .filter((role) => role.domain != "group")
              .map(
                (role) =>
                  `${role.id}:${role.root}:${role.domain}:${role.service}:${role.network}`
              )
          ).length
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
      // If there is a session principal, remove it from all of its groups.
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
  hmacEmail,
  generateRootFn,
}) => {
  // Generate a new account root.
  const accountRoot = generateRootFn();

  // Hash the email and password if it exists.
  const hashedPassword = payload.password && deps.hash(payload.password);

  // If there is a context principal, use it. Else, create a new principal.
  const principal = context.principal
    ? context.principal
    : {
        root: generateRootFn(),
        service: process.env.SERVICE,
        network: process.env.NETWORK,
      };

  // Encrypt the email.
  const emailEncrypted = await deps.encrypt({
      message: payload.email,
      key: "address",
      ring: "email",
      location: "global",
      project: process.env.GCP_PROJECT,
      format: "base64",
  });

  return {
    accountRoot,
    events: [
      // Register the account.
      {
        action: "register",
        domain: "account",
        service: process.env.SERVICE,
        root: accountRoot,
        payload: {
          ...(hashedPassword && { password: hashedPassword }),
          emailHmac: hmacEmail,
          emailEncrypted,
          principal,
        },
      },
      // Give the principal the AccountAdmin role over the account.
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

export default async ({
  payload,
  context,
  commandFn,
  aggregateFn,
  queryAggregatesFn,
  generateRootFn,
}) => {
  
  // Get the encrypted hmac of the email.  
  const hmacEmail = await deps.hmacCreate({
    secret: await deps.secret("email-hmac-key"),
    message: payload.email
  });

  // Check to see if there is an account with the provided email.
  const [account] = await queryAggregatesFn({
    domain: "account",
    key: "emailHmac",
    value: hmacEmail,
  });

  if (account) {
    // If the account has a password, make sure the matches the password passed in the payload.
    if (account.state.password && !(await deps.compare(payload.password, account.state.password)))
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
      
      // Get the account associated with the principal of the current session.
      const [principalAccount] = await queryAggregatesFn({
        domain: "account",
        key: "principal.root",
        value: context.principal.root,
      });

      // If the principal of the current session is already associated with an account, throw an error.
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
        hmacEmail,
        generateRootFn,
      });

  // Issue a challenge. If successful, add the account and new principal to the session.
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
      ...(payload.password && { password: payload.password }),
    },
    options: {
      events,
      upgrade: {
        account: {
          root: accountRoot,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
        // If the context has a principal, it necessarily is the account's principal and doesn't need adding.
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
