const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, stub, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

const email = "some-email";
const password = "some-password";
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

const principalRoot = "some-principal-root";
const principalService = "some-principal-service";
const principalNetwork = "some-principal-network";
const accountRoot = "some-root";

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
  roles: [
    {
      id: "some-role-id",
      subject: { root: "some-group-root", domain: "group", service, network },
    },
  ],
  groups: [{ root: "some-group-root", service, network }],
};

const sessionPrincipalAggregate = {
  roles: [
    {
      id: "some-group-role-id",
      subject: {
        root: "some-group-role-root",
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
  ],
  groups: [{ root: "some-group-role-root", service, network }],
};

process.env.SERVICE = service;
process.env.NETWORK = network;

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully if account is found", async () => {
    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns([account])
      .onSecondCall()
      .returns([]);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: principalAggregate,
      })
      .onSecondCall()
      .returns({
        state: sessionPrincipalAggregate,
      });

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
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "account",
      key: "email",
      value: email,
    });
    expect(queryAggregatesFnFake.getCall(1)).to.have.been.calledWith({
      domain: "account",
      key: "principal.root",
      value: contextPrincipalRoot,
    });
    expect(queryAggregatesFnFake).to.have.been.calledTwice;
    expect(aggregateFake.getCall(0)).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake.getCall(1)).to.have.been.calledWith(
      contextPrincipalRoot,
      {
        domain: "principal",
        service: contextPrincipalService,
        network: contextPrincipalNetwork,
      }
    );
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
            roles: ["some-group-role-id"],
            root: principalRoot,
            service: principalService,
          },
        ],
      },
      root: "some-group-role-root",
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
            root: "some-group-role-root",
            service,
          },
        ],
      },
    });
  });
  it("should return successfully if account is found with no principal in the context", async () => {
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
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "account",
      key: "email",
      value: email,
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
    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns([account])
      .onSecondCall()
      .returns([]);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: principalAggregate,
      })
      .onSecondCall()
      .returns({
        state: principalAggregate,
      });

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
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "account",
      key: "email",
      value: email,
    });
    expect(queryAggregatesFnFake.getCall(1)).to.have.been.calledWith({
      domain: "account",
      key: "principal.root",
      value: contextPrincipalRoot,
    });
    expect(queryAggregatesFnFake).to.have.been.calledTwice;
    expect(aggregateFake).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledWith(contextPrincipalRoot, {
      domain: "principal",
      service: contextPrincipalService,
      network: contextPrincipalNetwork,
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
                  network: contextPrincipalNetwork,
                  root: contextPrincipalRoot,
                  service: contextPrincipalService,
                },
              ],
            },
            root: "some-group-root",
            service,
          },
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

    const passwordHash = "some-password-hash";
    const hashFake = fake.returns(passwordHash);
    replace(deps, "hash", hashFake);

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
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      key: "email",
      value: email,
    });
    expect(hashFake).to.have.been.calledWith(password);
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
              password: passwordHash,
              email,
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

    const passwordHash = "some-password-hash";
    const hashFake = fake.returns(passwordHash);
    replace(deps, "hash", hashFake);

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
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        },
      },
      tokens: _tokens,
      statusCode,
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      key: "email",
      value: email,
    });
    expect(hashFake).to.have.been.calledWith(password);
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
              password: passwordHash,
              email,
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
        ],
      },
    });
  });
  it("should return successfully if account not found with principal in context", async () => {
    const queryAggregatesFnFake = fake.returns([]);

    const accountRoot = "some-new-account-root";

    const generateRootFake = fake.returns(accountRoot);

    const passwordHash = "some-password-hash";
    const hashFake = fake.returns(passwordHash);
    replace(deps, "hash", hashFake);

    const commandFnFake = fake.returns({
      body: { _tokens, receipt: { challenge } },
      statusCode,
    });

    replace(deps, "compare", fake.returns(true));

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
            service: process.env.SERVICE,
            network: process.env.NETWORK,
          },
        },
      },
      tokens: _tokens,
      statusCode,
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      key: "email",
      value: email,
    });
    expect(hashFake).to.have.been.calledWith(password);
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
              password: passwordHash,
              email,
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
        ],
      },
    });
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

    replace(deps, "compare", fake.returns(true));

    try {
      await main({
        payload,
        context,
        queryAggregatesFn: queryAggregatesFnFake,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(
        "The session already belongs to a different account."
      );
    }
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";

    const queryAggregatesFnFake = fake.rejects(errorMessage);

    replace(deps, "compare", fake.returns(true));
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

    const commandFnFake = fake.returns({ body: { _tokens }, statusCode });

    replace(deps, "compare", fake.returns(false));

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
