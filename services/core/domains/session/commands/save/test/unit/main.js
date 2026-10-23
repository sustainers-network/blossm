import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, replace, fake, stub, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

let clock;
const now = new Date();

const email = "some-email";
const emailEncrypted = "some-encrypted-email";
const hmacEmail = "some-hmac-email";
const hmacSecret = "some-hmac-secret";
const password = "some-password";
const hashedPassword = "some-hashed-password";
const payload = { email, password };
const challenge = "some-challenge";
const _tokens = "some-tokens";
const contextPrincipalRoot = "some-context-principal-root";
const contextPrincipalService = "some-context-principal-service";
const contextPrincipalNetwork = "some-context-principal-network";
const context = {
  principal: {
    root: contextPrincipalRoot,
    service: contextPrincipalService,
    network: contextPrincipalNetwork,
  },
};
const statusCode = "status-code";
const service = "some-service";
const domain = "some-domain";
const network = "some-network";
const region = "some-region";
const project = "some-project";

const principalRoot = "some-principal-root";
const principalService = "some-principal-service";
const principalNetwork = "some-principal-network";
const accountRoot = "some-root";

const principalGroupRoot = "some-principal-group-root";

const principalGroupAggregate = {
  root: principalGroupRoot,
  service,
  network,
};

const sessionPrincipalGroupRoot = "some-session-principal-group-root";

const sessionPrincipalGroupAggregate = {
  root: sessionPrincipalGroupRoot,
  service,
  network,
};

const account = {
  root: accountRoot,
  state: {
    principal: {
      root: principalRoot,
      service: principalService,
      network: principalNetwork,
    },
  },
};

const principalAggregate = {
  root: principalRoot,
  service: principalService,
  network: principalNetwork,
  state: {
    roles: [
      {
        id: "some-role-id",
        subject: { root: principalGroupRoot, domain: "group", service, network },
      },
      {
        id: "some-silly-role-id",
        subject: { root: "some-silly-root", domain: "non-group", service, network },
      },
    ]
  }
};

const roleId = "some-group-role-id";

const sessionPrincipalAggregate = {
  root: contextPrincipalRoot,
  service: contextPrincipalService,
  network: contextPrincipalNetwork,
  state: {
    roles: [
      {
        id: roleId,
        subject: {
          root: sessionPrincipalGroupRoot,
          domain: "group",
          service,
          network,
        },
      },
      {
        id: "some-other-role-id",
        subject: {
          root: "some-other-role-root",
          domain,
          service,
          network,
        },
      },
      {
        id: "some-silly-role-id",
        subject: { root: "some-silly-root", domain: "non-group", service, network },
      },
      {
        id: "some-other-silly-role-id",
        subject: { root: "some-other-silly-root", domain: "non-group", service, network },
      },
    ]
  }
};

process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_REGION = region;
process.env.GCP_PROJECT = project;

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully if account is found", async () => {

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const queryAggregatesFnFake = stub()
      .onCall(0)
      .returns([account])
      .onCall(1)
      .returns([sessionPrincipalGroupAggregate])
      .onCall(2)
      .returns([principalGroupAggregate]);

    const aggregateFake = stub()
      .onFirstCall()
      .returns(sessionPrincipalAggregate)
      .onSecondCall()
      .returns(principalAggregate);

    const commandFnFake = stub()
      .onSecondCall()
      .returns({
        body: { _tokens, receipt: { challenge } },
        statusCode,
      });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: {
        receipt: {
          challenge,
        },
      },
      statusCode,
      tokens: _tokens,
    });
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
    });
    expect(queryAggregatesFnFake.getCall(1)).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: contextPrincipalRoot,
      },
      {
        key: "principals.service",
        value: contextPrincipalService,
      },
      {
        key: "principals.network",
        value: contextPrincipalNetwork,
      }],
    });
    expect(queryAggregatesFnFake.getCall(2)).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: principalRoot,
      },
      {
        key: "principals.service",
        value: principalService,
      },
      {
        key: "principals.network",
        value: principalNetwork,
      }],
    });
    expect(queryAggregatesFnFake).to.have.callCount(3);
    expect(aggregateFake.getCall(0)).to.have.been.calledWith(
      contextPrincipalRoot,
      {
        domain: "principal",
        service: contextPrincipalService,
        network: contextPrincipalNetwork,
      }
    );
    expect(aggregateFake.getCall(1)).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledTwice;
    expect(commandFnFake).to.have.been.calledTwice;
    expect(commandFnFake.getCall(0)).to.have.been.calledWith({
      name: "add-principals",
      domain: "group",
      async: true,
      payload: {
        principals: [
          {
            network: principalNetwork,
            roles: [roleId],
            root: principalRoot,
            service: principalService,
          },
        ],
      },
      root: sessionPrincipalGroupRoot,
      service,
    });
    expect(commandFnFake.getCall(1)).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { email, password },
      options: {
        upgrade: {
          account: {
            root: accountRoot,
            service,
            network,
          },
        },
        events: [
          {
            action: "add-roles",
            domain: "principal",
            service,
            root: principalRoot,
            payload: {
              roles: [
                {
                  id: "some-other-role-id",
                  subject: {
                    root: "some-other-role-root",
                    domain,
                    service,
                    network,
                  },
                },
                {
                  id: "some-silly-role-id",
                  subject: { root: "some-silly-root", domain: "non-group", service, network },
                },
                {
                  id: "some-other-silly-role-id",
                  subject: { root: "some-other-silly-root", domain: "non-group", service, network },
                },
              ],
            },
          },
          {
            action: "remove-principals",
            domain: "group",
            payload: {
              principals: [
                {
                  network: contextPrincipalNetwork,
                  root: contextPrincipalRoot,
                  service: contextPrincipalService,
                },
              ],
            },
            root: sessionPrincipalGroupRoot,
            service,
          },
        ],
      },
    });
  });
  it("should return successfully if account is found with no principal in the context", async () => {

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const queryAggregatesFnFake = fake.returns([account]);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: principalAggregate,
      })
      .onSecondCall()
      .returns({
        state: sessionPrincipalAggregate,
      });

    const commandFnFake = fake.returns({
      body: { _tokens, receipt: { challenge } },
      statusCode,
    });

    replace(deps, "compare", fake.returns(true));

    const context = {};
    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: {
        receipt: {
          challenge,
        },
      },
      tokens: _tokens,
      statusCode,
    });
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
    });
    expect(queryAggregatesFnFake).to.have.been.calledOnce;
    expect(aggregateFake).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledOnce;
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { email, password },
      options: {
        upgrade: {
          account: {
            root: accountRoot,
            service,
            network,
          },
          principal: {
            root: principalRoot,
            service: principalService,
            network: principalNetwork,
          },
        },
        events: [],
      },
    });
  });
  it("should return successfully if account is found and there are no new roles to add", async () => {
    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns([account])
      .onSecondCall()
      .returns([principalGroupAggregate])
      .onThirdCall()
      .returns([principalGroupAggregate]);

    const aggregateFake = stub()
      .onFirstCall()
      .returns(principalAggregate)
      .onSecondCall()
      .returns(principalAggregate);

    const commandFnFake = fake.returns({
      body: { _tokens, receipt: { challenge } },
      statusCode,
    });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: {
        receipt: {
          challenge,
        },
      },
      tokens: _tokens,
      statusCode,
    });
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
    });
    expect(queryAggregatesFnFake.getCall(1)).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: principalRoot,
      },
      {
        key: "principals.service",
        value: principalService,
      },
      {
        key: "principals.network",
        value: principalNetwork,
      }],
    });
    expect(queryAggregatesFnFake.getCall(2)).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: principalRoot,
      },
      {
        key: "principals.service",
        value: principalService,
      },
      {
        key: "principals.network",
        value: principalNetwork,
      }],
    });
    expect(queryAggregatesFnFake).to.have.callCount(3);
    expect(aggregateFake.getCall(0)).to.have.been.calledWith(contextPrincipalRoot, {
      domain: "principal",
      service: contextPrincipalService,
      network: contextPrincipalNetwork,
    });
    expect(aggregateFake.getCall(1)).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledTwice;
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { email, password },

      options: {
        upgrade: {
          account: {
            root: accountRoot,
            service,
            network,
          },
        },
        events: [
          {
            action: "remove-principals",
            domain: "group",
            payload: {
              principals: [
                {
                  network: principalNetwork,
                  root: principalRoot,
                  service: principalService,
                },
              ],
            },
            root: principalGroupRoot,
            service,
          }
        ],
      },
    });
  });
  it("should return successfully if account not found with no principal in the context", async () => {
    const queryAggregatesFnFake = fake.returns([]);

    const accountRoot = "some-new-account-root";
    const principalRoot = "some-new-principal-root";

    const generateRootFake = stub()
      .onFirstCall()
      .returns(accountRoot)
      .onSecondCall()
      .returns(principalRoot);

    const hashFake = fake.resolves(hashedPassword);
    replace(deps, "hash", hashFake);

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const encryptFake = fake.returns(emailEncrypted);
    replace(deps, "encrypt", encryptFake);

    const commandFnFake = fake.returns({
      body: { _tokens, receipt: { challenge } },
      statusCode,
    });

    replace(deps, "compare", fake.returns(true));

    const context = {};
    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
      generateRootFn: generateRootFake,
    });

    expect(result).to.deep.equal({
      response: {
        receipt: {
          challenge,
          account: {
            root: accountRoot,
            service,
            network,
          },
        },
      },
      tokens: _tokens,
      statusCode,
    });
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
    });
    expect(hashFake).to.have.been.calledWith(password);
    expect(encryptFake).to.have.been.calledWith({
      message: email,
      key: "address",
      ring: "email",
      location: "global",
      project: project,
      format: "base64"
    });
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { email, password },
      options: {
        upgrade: {
          account: {
            root: accountRoot,
            service,
            network,
          },
          principal: {
            root: principalRoot,
            service,
            network,
          },
        },
        events: [
          {
            action: "register",
            domain: "account",
            service,
            root: accountRoot,
            payload: {
              password: hashedPassword,
              emailHmac: hmacEmail,
              emailEncrypted,
              principal: { root: principalRoot, service, network },
            },
          },
          {
            action: "add-roles",
            domain: "principal",
            service,
            root: principalRoot,
            payload: {
              roles: [
                {
                  id: `AccountAdmin`,
                  subject: {
                    root: accountRoot,
                    domain: "account",
                    service,
                    network,
                  },
                },
              ],
            },
          },
          {
            action: "set-subject",
            domain: "principal",
            service,
            root: principalRoot,
            payload: {
              subject: {
                root: accountRoot,
                domain: "account",
                service,
                network,
              }
            }
          },
        ],
      },
    });
  });
  it("should return successfully if account not found with principal in context", async () => {
    const queryAggregatesFnFake = fake.returns([]);

    const accountRoot = "some-new-account-root";

    const generateRootFake = fake.returns(accountRoot);

    const aggregateFnFake = stub()
      .onFirstCall()
      .returns(sessionPrincipalAggregate);

    const hashFake = fake.resolves(hashedPassword);
    replace(deps, "hash", hashFake);

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const encryptFake = fake.returns(emailEncrypted);
    replace(deps, "encrypt", encryptFake);

    const commandFnFake = fake.returns({
      body: { _tokens, receipt: { challenge } },
      statusCode,
    });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      aggregateFn: aggregateFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
      generateRootFn: generateRootFake,
    });

    expect(result).to.deep.equal({
      response: {
        receipt: {
          challenge,
          account: {
            root: accountRoot,
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        },
      },
      tokens: _tokens,
      statusCode,
    });
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
    });
    expect(aggregateFnFake).to.have.been.calledWith(contextPrincipalRoot, {
      domain: "principal",
      service: contextPrincipalService,
      network: contextPrincipalNetwork,
    });
    expect(hashFake).to.have.been.calledWith(password);
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    expect(encryptFake).to.have.been.calledWith({
      message: email,
      key: "address",
      ring: "email",
      location: "global",
      project: project,
      format: "base64"
    });
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { email, password },
      options: {
        upgrade: {
          account: {
            root: accountRoot,
            service,
            network,
          },
        },
        events: [
          {
            action: "register",
            domain: "account",
            service,
            root: accountRoot,
            payload: {
              password: hashedPassword,
              emailHmac: hmacEmail,
              emailEncrypted,
              principal: {
                root: contextPrincipalRoot,
                service: contextPrincipalService,
                network: contextPrincipalNetwork,
              },
            },
          },
          {
            action: "add-roles",
            domain: "principal",
            service,
            root: contextPrincipalRoot,
            payload: {
              roles: [
                {
                  id: "AccountAdmin",
                  subject: {
                    root: accountRoot,
                    domain: "account",
                    service,
                    network,
                  },
                },
              ],
            },
          },
          {
            action: "set-subject",
            domain: "principal",
            service: contextPrincipalService,
            root: contextPrincipalRoot,
            payload: {
              subject: {
                root: accountRoot,
                domain: "account",
                service,
                network,
              }
            }
          }
        ],
      },
    });
  });
  it("should not issue a challenge if password hashing fails", async () => {
    const hashError = new Error("Password hashing failed.");
    const hashResult = Promise.reject(hashError);
    // Observe the rejection while checking whether main propagates it.
    hashResult.catch(() => {});
    replace(deps, "hash", fake.returns(hashResult));
    replace(deps, "secret", fake.returns(hmacSecret));
    replace(deps, "hmacCreate", fake.returns(hmacEmail));
    replace(deps, "encrypt", fake.returns(emailEncrypted));
    const commandFn = fake.returns({
      body: { _tokens, receipt: { challenge } },
      statusCode,
    });

    let caught;
    try {
      await main({
        payload,
        context: {},
        commandFn,
        queryAggregatesFn: fake.returns([]),
        generateRootFn: fake.returns(accountRoot),
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).to.equal(hashError);
    expect(commandFn).not.to.have.been.called;
  });
  it("should return nothing if context principal is the account's principal", async () => {
    const queryAggregatesFnFake = fake.returns([
      {
        state: {
          principal: {
            root: contextPrincipalRoot,
            service: contextPrincipalService,
            network: contextPrincipalNetwork,
          },
        },
      },
    ]);

    replace(deps, "compare", fake.returns(true));

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const result = await main({
      payload,
      context,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal();
  });
  it("should throw correctly if the session is saved to a different account", async () => {
    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns([
        {
          state: {
            principal: {
              root: "some-random-root",
              service: "some-random-service",
              network: "some-random-network",
            },
          },
        },
      ])
      .onSecondCall()
      .returns(["something"]);

    const aggregateFnFake = fake.returns({
      state: {
        subject: "some-subject"
      }
    });

    replace(deps, "compare", fake.returns(true));

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    try {
      await main({
        payload,
        context,
        aggregateFn: aggregateFnFake,
        queryAggregatesFn: queryAggregatesFnFake,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(
        "The session already belongs to a different subject."
      );
    }
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";

    const queryAggregatesFnFake = fake.rejects(errorMessage);

    replace(deps, "compare", fake.returns(true));

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    try {
      await main({
        payload,
        context,
        queryAggregatesFn: queryAggregatesFnFake,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw if compare fails", async () => {
    const queryAggregatesFnFake = fake.returns([{ ...account, state: { ...account.state, password: "some-weird-password" } }]);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: principalAggregate,
      })
      .onSecondCall()
      .returns({
        state: sessionPrincipalAggregate,
      });

    const commandFnFake = fake.returns({ body: { _tokens }, statusCode });

    replace(deps, "compare", fake.returns(false));

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    try {
      await main({
        payload,
        context,
        commandFn: commandFnFake,
        aggregateFn: aggregateFake,
        queryAggregatesFn: queryAggregatesFnFake,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal("This password isn't right.");
    }
  });
});
