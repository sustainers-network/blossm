const { expect } = require("chai").use(require("sinon-chai"));
const { replace, restore, fake, stub } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const payload = "some-payload";
const root = "some-root";
const service = "some-service";
const network = "some-network";
const contextSessionRoot = "some-context-session-root";
const contextSession = {
  root: contextSessionRoot,
};
const principalRoot = "some-principal-root";
const principalService = "some-principal-service";
const principalNetwork = "some-principal-network";

const context = {
  session: contextSession,
};

process.env.SERVICE = service;
process.env.NETWORK = network;

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const uuid = "some-uuid";
    const uuidFake = stub()
      .onFirstCall()
      .returns(root)
      .onSecondCall()
      .returns(uuid);
    replace(deps, "uuid", uuidFake);

    const tokens = "some-tokens";
    const newContext = "some-new-context";
    const commandFnFake = fake.returns({
      body: { tokens, context: newContext },
    });

    const result = await main({
      payload,
      context,
      commandFn: commandFnFake,
    });
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service,
          network,
          action: "add-roles",
          root: uuid,
          payload: {
            roles: [{ id: "SceneAdmin", root, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-scenes",
          root: uuid,
          payload: {
            scenes: [{ root, service, network }],
          },
        },
        { action: "register", payload, root },
      ],
      response: {
        tokens,
        context: newContext,
        receipt: {
          principal: {
            root: uuid,
            service,
            network,
          },
          scene: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(commandFnFake).to.have.been.calledWith({
      domain: "session",
      name: "upgrade",
      payload: {
        principal: {
          root: uuid,
          service,
          network,
        },
      },
    });
  });
  it("should return successfully if there's a context principal", async () => {
    const uuid = "some-uuid";
    const uuidFake = stub()
      .onFirstCall()
      .returns(root)
      .onSecondCall()
      .returns(uuid);
    replace(deps, "uuid", uuidFake);

    const token = "some-token";
    const commandFnFake = fake.returns({ body: { token } });

    const principalContext = {
      session: contextSession,
      principal: {
        root: principalRoot,
        service: principalService,
        network: principalNetwork,
      },
    };
    const result = await main({
      payload,
      context: principalContext,
      commandFn: commandFnFake,
    });
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service: principalService,
          network: principalNetwork,
          action: "add-roles",
          root: principalRoot,
          payload: {
            roles: [{ id: "SceneAdmin", root, service, network }],
          },
        },
        {
          domain: "principal",
          service: principalService,
          network: principalNetwork,
          action: "add-scenes",
          root: principalRoot,
          payload: {
            scenes: [{ root, service, network }],
          },
        },
        { action: "register", payload, root },
      ],
      response: {
        receipt: {
          scene: {
            root,
            service,
            network,
          },
        },
      },
    });
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const uuidFake = fake.throws(errorMessage);
    replace(deps, "uuid", uuidFake);
    try {
      await main({ context: {} });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
