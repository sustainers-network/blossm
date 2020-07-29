const { expect } = require("chai").use(require("sinon-chai"));
const { replace, restore, fake } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const payloadNetwork = "some-payload-network";
const payload = { network: payloadNetwork };
const identity = "some-identity";
const context = { identity };

const newContextPrincipalRoot = "some-new-context-principal-root";
const newContextPrincipalService = "some-new-context-principal-service";
const newContextPrincipalNetwork = "some-new-context-principal-network";

const newContext = {
  principal: {
    root: newContextPrincipalRoot,
    service: newContextPrincipalService,
    network: newContextPrincipalNetwork,
  },
};

const domain = "some-domain";
const service = "some-service";
const network = "some-network";

process.env.DOMAIN = domain;
process.env.SERVICE = service;
process.env.NETWORK = network;

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const nodeRoot = "some-node-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(nodeRoot);

    replace(deps, "uuid", uuidFake);

    const tokens = "some-tokens";
    const principalRoot = "some-principal-root";
    const principalService = "some-principal-service";
    const principalNetwork = "some-principal-network";

    const commandFnFake = fake.returns({
      body: {
        tokens,
        context: newContext,
        receipt: {
          principal: {
            root: principalRoot,
            service: principalService,
            network: principalNetwork,
          },
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
    });

    const result = await main({ payload, context, commandFn: commandFnFake });

    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service: newContextPrincipalService,
          network: newContextPrincipalNetwork,
          action: "add-roles",
          context: newContext,
          root: newContextPrincipalRoot,
          payload: {
            roles: [{ id: "NodeAdmin", root: nodeRoot, service, network }],
          },
        },
        {
          action: "register",
          root: nodeRoot,
          context: newContext,
          payload: {
            network: payloadNetwork,
            scene: {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          },
        },
      ],
      response: {
        tokens,
        context: newContext,
        receipt: {
          node: { root: nodeRoot, service, network },
          principal: {
            root: principalRoot,
            service: principalService,
            network: principalNetwork,
          },
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
    });
    expect(commandFnFake).to.have.been.calledWith({
      name: "register",
      domain: "scene",
      service: "core",
      payload: {
        root: nodeRoot,
        domain,
        service,
        network,
      },
    });
  });
  it("should return successfully if principal not returned as a reference, and no new context", async () => {
    const nodeRoot = "some-node-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(nodeRoot);

    replace(deps, "uuid", uuidFake);

    const tokens = "some-tokens";
    const commandFnFake = fake.returns({
      body: {
        tokens,
        receipt: {
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
    });

    const contextPrincipalRoot = "some-context-principal-root";
    const contextPrincipalService = "some-context-principal-service";
    const contextPrincipalNetwork = "some-context-principal-network";

    const result = await main({
      payload,
      context: {
        ...context,
        principal: {
          root: contextPrincipalRoot,
          service: contextPrincipalService,
          network: contextPrincipalNetwork,
        },
      },
      commandFn: commandFnFake,
    });
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service: contextPrincipalService,
          network: contextPrincipalNetwork,
          action: "add-roles",
          context: {
            ...context,
            principal: {
              root: contextPrincipalRoot,
              service: contextPrincipalService,
              network: contextPrincipalNetwork,
            },
          },
          root: contextPrincipalRoot,
          payload: {
            roles: [{ id: "NodeAdmin", root: nodeRoot, service, network }],
          },
        },
        {
          action: "register",
          root: nodeRoot,
          context: {
            ...context,
            principal: {
              root: contextPrincipalRoot,
              service: contextPrincipalService,
              network: contextPrincipalNetwork,
            },
          },
          payload: {
            network: payloadNetwork,
            scene: {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          },
        },
      ],
      response: {
        tokens,
        receipt: {
          node: { root: nodeRoot, service, network },
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
    });
    expect(commandFnFake).to.have.been.calledWith({
      name: "register",
      domain: "scene",
      service: "core",
      payload: {
        root: nodeRoot,
        domain,
        service,
        network,
      },
    });
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const uuidFake = fake.throws(errorMessage);
    replace(deps, "uuid", uuidFake);
    try {
      await main({});
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
