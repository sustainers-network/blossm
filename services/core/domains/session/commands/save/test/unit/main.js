const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, stub, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

const id = "some-id";
const phone = "some-phone";
const payload = { id, phone };
const tokens = "some-tokens";
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
const network = "some-network";

const principalRoot = "some-principal-root";
const principalService = "some-principal-service";
const principalNetwork = "some-principal-network";
const identityRoot = "some-root";

const identity = {
  root: identityRoot,
  state: {
    principal: {
      root: principalRoot,
      service: principalService,
      network: principalNetwork,
    },
  },
};

const principalAggregate = {
  roles: [{ id: "some-role-id", root: "some-role-root", service, network }],
};

const sessionprincipalAggregate = {
  roles: [
    {
      id: "some-other-role-id",
      root: "some-other-role-root",
      service,
      network,
    },
  ],
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
  it("should return successfully if identity is found", async () => {
    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns({ body: [identity] })
      .onSecondCall()
      .returns({ body: [] });

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: sessionprincipalAggregate,
      });

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "identity",
      key: "id",
      value: id,
    });
    expect(queryAggregatesFnFake.getCall(1)).to.have.been.calledWith({
      domain: "identity",
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
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { id, phone },
      options: {
        upgrade: {
          identity: {
            root: identityRoot,
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
                  root: "some-other-role-root",
                  service,
                  network,
                },
              ],
            },
          },
        ],
      },
    });
  });
  it("should return successfully if identity is found with no principal in the context", async () => {
    const queryAggregatesFnFake = fake.returns({ body: [identity] });

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: sessionprincipalAggregate,
      });

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

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
      response: { tokens },
      statusCode,
    });
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "identity",
      key: "id",
      value: id,
    });
    expect(queryAggregatesFnFake).to.have.been.calledOnce;
    expect(aggregateFake).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledOnce;
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { id, phone },
      options: {
        upgrade: {
          identity: {
            root: identityRoot,
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
  it("should return successfully if identity is found and there are no new roles to add", async () => {
    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns({ body: [identity] })
      .onSecondCall()
      .returns({ body: [] });

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: principalAggregate,
      });

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(queryAggregatesFnFake.getCall(0)).to.have.been.calledWith({
      domain: "identity",
      key: "id",
      value: id,
    });
    expect(queryAggregatesFnFake.getCall(1)).to.have.been.calledWith({
      domain: "identity",
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
      payload: { phone, id },

      options: {
        upgrade: {
          identity: {
            root: identityRoot,
            service,
            network,
          },
        },
        events: [],
      },
    });
  });
  it("should return successfully if identity not found with no principal in the context", async () => {
    const queryAggregatesFnFake = fake.returns({ body: [] });

    const identityRoot = "some-new-identity-root";
    const principalRoot = "some-new-principal-root";

    const uuidFake = stub()
      .onFirstCall()
      .returns(identityRoot)
      .onSecondCall()
      .returns(principalRoot);
    replace(deps, "uuid", uuidFake);

    const phoneHash = "some-phone-hash";
    const hashFake = fake.returns(phoneHash);
    replace(deps, "hash", hashFake);

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

    replace(deps, "compare", fake.returns(true));

    const context = {};
    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "identity",
      key: "id",
      value: id,
    });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { id, phone },
      options: {
        upgrade: {
          identity: {
            root: identityRoot,
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
            domain: "identity",
            service,
            root: identityRoot,
            payload: {
              phone: phoneHash,
              id,
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
                { id: `IdentityAdmin`, root: identityRoot, service, network },
              ],
            },
          },
        ],
      },
    });
  });
  it("should return successfully if identity not found with no principal in the context and email as id", async () => {
    const queryAggregatesFnFake = fake.returns({ body: [] });

    const identityRoot = "some-new-identity-root";
    const principalRoot = "some-new-principal-root";

    const uuidFake = stub()
      .onFirstCall()
      .returns(identityRoot)
      .onSecondCall()
      .returns(principalRoot);

    replace(deps, "uuid", uuidFake);

    const phoneHash = "some-phone-hash";
    const hashFake = fake.returns(phoneHash);
    replace(deps, "hash", hashFake);

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

    replace(deps, "compare", fake.returns(true));

    const context = {};
    const email = "some@email.com";
    const result = await main({
      payload: {
        ...payload,
        id: email,
      },
      context,
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "identity",
      key: "id",
      value: email,
    });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { id: email, phone },
      options: {
        upgrade: {
          identity: {
            root: identityRoot,
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
            domain: "identity",
            service,
            root: identityRoot,
            payload: {
              phone: phoneHash,
              email,
              id: email,
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
                { id: `IdentityAdmin`, root: identityRoot, service, network },
              ],
            },
          },
        ],
      },
    });
  });
  it("should return successfully if identity not found with principal in context", async () => {
    const queryAggregatesFnFake = fake.returns({ body: [] });

    const identityRoot = "some-new-identity-root";

    const uuidFake = fake.returns(identityRoot);
    replace(deps, "uuid", uuidFake);

    const phoneHash = "some-phone-hash";
    const hashFake = fake.returns(phoneHash);
    replace(deps, "hash", hashFake);

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "identity",
      key: "id",
      value: id,
    });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFnFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
      payload: { id, phone },
      options: {
        upgrade: {
          identity: {
            root: identityRoot,
            service,
            network,
          },
        },
        events: [
          {
            action: "register",
            domain: "identity",
            service,
            root: identityRoot,
            payload: {
              phone: phoneHash,
              id,
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
                { id: "IdentityAdmin", root: identityRoot, service, network },
              ],
            },
          },
        ],
      },
    });
  });
  it("should return nothing if context principal is the identity's principal", async () => {
    const queryAggregatesFnFake = fake.returns({
      body: [
        {
          state: {
            principal: {
              root: contextPrincipalRoot,
              service: contextPrincipalService,
              network: contextPrincipalNetwork,
            },
          },
        },
      ],
    });

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(result).to.deep.equal({});
  });
  it("should throw correctly if the session is saved to a different identity", async () => {
    const queryAggregatesFnFake = stub()
      .onFirstCall()
      .returns({
        body: [
          {
            state: {
              principal: {
                root: "some-random-root",
                service: "some-random-service",
                network: "some-random-network",
              },
            },
          },
        ],
      })
      .onSecondCall()
      .returns({ body: ["something"] });

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
        "The session is already saved to a different identity."
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
    const queryAggregatesFnFake = fake.returns({ body: [identity] });

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: sessionprincipalAggregate,
      });

    const commandFnFake = fake.returns({ body: { tokens }, statusCode });

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
      expect(e.message).to.equal("This phone number isn't right.");
    }
  });
});
