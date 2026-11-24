import deps from "./deps.js";

const getEventsForPermissionsMerge = async ({
  principal,
  sessionPrincipalAggregate,
  accountRoot,
  aggregateFn,
  queryAggregatesFn,
}) => {

  // Get the aggregates of the principal of the account and the current principal of the session if one exists.
  const [principalAggregate, sessionPrincipalGroupAggregates] = await Promise.all([
    aggregateFn(principal.root, {
      domain: "principal",
    }),
    ...(sessionPrincipalAggregate
      ? [
          queryAggregatesFn({
            domain: "group",
            queryPairs: [{
              key: "principals.root",
              value: sessionPrincipalAggregate.root,
            },
            {
              key: "principals.service",
              value: sessionPrincipalAggregate.service,
            },
            {
              key: "principals.network",
              value: sessionPrincipalAggregate.network,
            }],
          }),
        ]
      : []),
  ]);
  
  // The roles the session principal holds for each of its groups.
  const sessionGroups = (sessionPrincipalGroupAggregates || []).map(
    (groupAggregate) => ({
      groupAggregate,
      roles: sessionPrincipalAggregate.state.roles.filter(
        (role) =>
          role.subject.root == groupAggregate.root &&
          role.subject.domain == "group" &&
          role.subject.service == groupAggregate.service &&
          role.subject.network == groupAggregate.network
      ),
    })
  );

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
              .filter((role) => role.subject.domain != "group")
              .map(
                (role) =>
                  `${role.id}:${role.subject.root}:${role.subject.domain}:${role.subject.service}:${role.subject.network}`
              ),
            principalAggregate.state.roles
              .filter((role) => role.subject.domain != "group")
              .map(
                (role) =>
                  `${role.id}:${role.subject.root}:${role.subject.domain}:${role.subject.service}:${role.subject.network}`
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
      // The account's principal takes the session principal's place in each of its groups,
      // with the same roles. These events only happen once the challenge is answered.
      ...sessionGroups
        .filter(({ roles }) => roles.length)
        .flatMap(({ groupAggregate, roles }) => [
          {
            domain: "principal",
            service: process.env.SERVICE,
            action: "add-roles",
            root: principal.root,
            payload: { roles },
          },
          {
            domain: "group",
            service: groupAggregate.service,
            action: "add-principals",
            root: groupAggregate.root,
            payload: {
              principals: [
                {
                  root: principal.root,
                  service: principal.service,
                  network: principal.network,
                },
              ],
            },
          },
        ]),
      // The session principal gives up its roles for those groups.
      ...(sessionGroups.some(({ roles }) => roles.length)
        ? [
            {
              domain: "principal",
              service: process.env.SERVICE,
              action: "remove-roles",
              root: sessionPrincipalAggregate.root,
              payload: {
                roles: sessionGroups.flatMap(({ roles }) => roles),
              },
            },
          ]
        : []),
      // If there is a session principal, remove it from all of its groups.
      ...(sessionPrincipalGroupAggregates ? sessionPrincipalGroupAggregates.map((groupAggregate) => ({
            domain: "group",
            service: groupAggregate.service,
            action: "remove-principals",
            root: groupAggregate.root,
            payload: {
              principals: [{
                root: sessionPrincipalAggregate.root,
                service: sessionPrincipalAggregate.service,
                network: sessionPrincipalAggregate.network,
              }],
            },
          })) : []),
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
  const hashedPassword = payload.password && (await deps.hash(payload.password));

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
      {
        action: "set-subject",
        domain: "principal",
        service: principal.service,
        root: principal.root,
        payload: {
          subject: {
            root: accountRoot,
            domain: "account",
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          }
        }
      }
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
    queryPairs: [{
      key: "emailHmac",
      value: hmacEmail,
    }],
  });

  // The account's password is checked by the challenge issue command below,
  // which counts each check against the email.

  // Don't log an event or issue a challange if
  // the context already has the account's principal.
  if (
    account && 
    context.principal &&
    account.state.principal.root == context.principal.root &&
    account.state.principal.service == context.principal.service &&
    account.state.principal.network == context.principal.network
  )
    return;
     
  // Keep a reference to the context's principal aggregate.
  let sessionPrincipalAggregate;

  // Check to see if the principal of the current session is already associated with an account.
  if (context.principal) {
    // Get the subject associated with the principal of the current session.
    sessionPrincipalAggregate = await aggregateFn(context.principal.root, {
      domain: "principal",
      service: context.principal.service,
      network: context.principal.network,
    })
    
    // If the principal of the current session is already associated with a subject, throw an error.
    if (sessionPrincipalAggregate.state.subject)
      throw deps.badRequestError.message(
        "The session already belongs to a different subject."
      );
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
        sessionPrincipalAggregate,
        aggregateFn,
        queryAggregatesFn,
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
