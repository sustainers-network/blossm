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
const contextprincipalRoot = "some-context-principal-root";
const contextprincipalService = "some-context-principal-service";
const contextprincipalNetwork = "some-context-principal-network";
const context = {
  principal: {
    root: contextprincipalRoot,
    service: contextprincipalService,
    network: contextprincipalNetwork,
  },
};
const statusCode = "status-code";
const service = "some-service";
const network = "some-network";

const claims = "some-claims";

const principalRoot = "some-principal-root";
const principalService = "some-principal-service";
const principalNetwork = "some-principal-network";
const identityRoot = "some-root";

const identity = {
  headers: {
    root: identityRoot,
  },
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
    const queryFake = fake.returns({ body: [identity] });
    const otherQueryFake = fake.returns({ body: [] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const otherSetFake = fake.returns({
      query: otherQueryFake,
    });
    const eventStoreFake = stub()
      .onFirstCall()
      .returns({
        set: setFake,
      })
      .onSecondCall()
      .returns({ set: otherSetFake });
    replace(deps, "eventStore", eventStoreFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: sessionprincipalAggregate,
      });

    const issueFake = fake.returns({ body: { tokens }, statusCode });
    const anotherSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: anotherSetFake,
    });

    replace(deps, "command", commandFake);

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(queryFake).to.have.been.calledWith({ key: "id", value: id });
    expect(aggregateFake).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledWith(contextprincipalRoot, {
      domain: "principal",
      service: contextprincipalService,
      network: contextprincipalNetwork,
    });
    expect(aggregateFake).to.have.been.calledTwice;
    expect(commandFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith(
      { id, phone },
      {
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
      }
    );
  });
  it("should return successfully if identity is found with no principal in the context", async () => {
    const queryFake = fake.returns({ body: [identity] });
    const otherQueryFake = fake.returns([]);
    const setFake = fake.returns({
      query: queryFake,
    });
    const otherSetFake = fake.returns({
      query: otherQueryFake,
    });
    const eventStoreFake = stub()
      .onFirstCall()
      .returns({
        set: setFake,
      })
      .onSecondCall()
      .returns({ set: otherSetFake });
    replace(deps, "eventStore", eventStoreFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: sessionprincipalAggregate,
      });

    const issueFake = fake.returns({ body: { tokens }, statusCode });
    const anotherSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: anotherSetFake,
    });

    replace(deps, "command", commandFake);

    replace(deps, "compare", fake.returns(true));

    const context = {};
    const result = await main({
      payload,
      context,
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(queryFake).to.have.been.calledWith({ key: "id", value: id });
    expect(aggregateFake).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledOnce;
    expect(commandFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith(
      { id, phone },
      {
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
      }
    );
  });
  it("should return successfully if identity is found and there are no new roles to add", async () => {
    const queryFake = fake.returns({ body: [identity] });
    const otherQueryFake = fake.returns({ body: [] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const otherSetFake = fake.returns({
      query: otherQueryFake,
    });
    const eventStoreFake = stub()
      .onFirstCall()
      .returns({
        set: setFake,
      })
      .onSecondCall()
      .returns({ set: otherSetFake });
    replace(deps, "eventStore", eventStoreFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: principalAggregate,
      });

    const issueFake = fake.returns({ body: { tokens }, statusCode });
    const anotherSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: anotherSetFake,
    });

    replace(deps, "command", commandFake);

    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(queryFake).to.have.been.calledWith({ key: "id", value: id });
    expect(aggregateFake).to.have.been.calledWith(principalRoot, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledWith(contextprincipalRoot, {
      domain: "principal",
      service: contextprincipalService,
      network: contextprincipalNetwork,
    });
    expect(aggregateFake).to.have.been.calledTwice;
    expect(commandFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith(
      { phone, id },
      {
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
      }
    );
  });
  it("should return successfully if identity not found with no principal in the context", async () => {
    const queryFake = fake.returns({ body: [] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

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

    const issueFake = fake.returns({ body: { tokens }, statusCode });
    const anotherSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: anotherSetFake,
    });

    replace(deps, "command", commandFake);

    replace(deps, "compare", fake.returns(true));

    const context = {};
    const result = await main({
      payload,
      context,
      claims,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(queryFake).to.have.been.calledWith({ key: "id", value: id });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith(
      { id, phone },
      {
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
      }
    );
  });
  it("should return successfully if identity not found with principal in context", async () => {
    const queryFake = fake.returns({ body: [] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const identityRoot = "some-new-identity-root";

    const uuidFake = fake.returns(identityRoot);
    replace(deps, "uuid", uuidFake);

    const phoneHash = "some-phone-hash";
    const hashFake = fake.returns(phoneHash);
    replace(deps, "hash", hashFake);

    const issueFake = fake.returns({ body: { tokens }, statusCode });
    const anotherSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: anotherSetFake,
    });

    replace(deps, "command", commandFake);
    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      claims,
    });

    expect(result).to.deep.equal({
      response: { tokens },
      statusCode,
    });
    expect(eventStoreFake).to.have.been.calledWith({ domain: "identity" });
    expect(setFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(queryFake).to.have.been.calledWith({ key: "id", value: id });
    expect(hashFake).to.have.been.calledWith(phone);
    expect(commandFake).to.have.been.calledWith({
      name: "issue",
      domain: "challenge",
    });
    expect(anotherSetFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith(
      { id, phone },
      {
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
                  root: contextprincipalRoot,
                  service: contextprincipalService,
                  network: contextprincipalNetwork,
                },
              },
            },
            {
              action: "add-roles",
              domain: "principal",
              service,
              root: contextprincipalRoot,
              payload: {
                roles: [
                  { id: "IdentityAdmin", root: identityRoot, service, network },
                ],
              },
            },
          ],
        },
      }
    );
  });

  it("should return nothing if context principal is the identity's principal", async () => {
    const queryFake = fake.returns({
      body: [
        {
          state: {
            principal: {
              root: contextprincipalRoot,
              service: contextprincipalService,
              network: contextprincipalNetwork,
            },
          },
        },
      ],
    });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);
    replace(deps, "compare", fake.returns(true));

    const result = await main({
      payload,
      context,
      claims,
    });

    expect(result).to.deep.equal({});
  });
  it("should throw correctly if the session is saved to a different identity", async () => {
    const firstQueryFake = fake.returns({
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
    });
    const secondQueryFake = fake.returns({ body: ["something"] });
    const firstSetFake = fake.returns({
      query: firstQueryFake,
    });
    const secondSetFake = fake.returns({
      query: secondQueryFake,
    });
    const eventStoreFake = stub()
      .onFirstCall()
      .returns({
        set: firstSetFake,
      })
      .onSecondCall()
      .returns({
        set: secondSetFake,
      });
    replace(deps, "eventStore", eventStoreFake);
    replace(deps, "compare", fake.returns(true));

    try {
      await main({
        payload,
        context,
        claims,
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

    const queryFake = fake.rejects(errorMessage);
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    replace(deps, "compare", fake.returns(true));
    try {
      await main({
        payload,
        context,
        claims,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw if compare fails", async () => {
    const queryFake = fake.returns({ body: [identity] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        aggregate: principalAggregate,
      })
      .onSecondCall()
      .returns({
        aggregate: sessionprincipalAggregate,
      });

    const issueFake = fake.returns({ body: { tokens }, statusCode });
    const anotherSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: anotherSetFake,
    });

    replace(deps, "command", commandFake);

    replace(deps, "compare", fake.returns(false));

    try {
      await main({
        payload,
        context,
        claims,
        aggregateFn: aggregateFake,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal("This phone number isn't right.");
    }
  });
});
