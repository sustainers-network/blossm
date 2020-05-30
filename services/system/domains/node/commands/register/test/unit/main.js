const { expect } = require("chai").use(require("sinon-chai"));
const { replace, restore, fake, stub } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const payloadNetwork = "some-payload-network";
const payload = { network: payloadNetwork };
const identity = "some-identity";
const context = { identity };
const claims = {
  a: 1,
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

    const uuidFake = stub()
      .onFirstCall()
      .returns(nodeRoot)
      .onSecondCall()
      .returns(sceneRoot);

    replace(deps, "uuid", uuidFake);

    const tokens = "some-tokens";
    const principalRoot = "some-principal-root";
    const principalService = "some-principal-service";
    const principalNetwork = "some-principal-network";

    const newContext = "some-new-context";
    const issueFake = fake.returns({
      body: {
        tokens,
        context: newContext,
        references: {
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
    const setFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: setFake,
    });
    replace(deps, "command", commandFake);

    const result = await main({ payload, context, claims });
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service: principalService,
          network: principalNetwork,
          action: "add-roles",
          context: newContext,
          root: principalRoot,
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
        references: {
          node: { root: nodeRoot, service, network },
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
    });
    expect(commandFake).to.have.been.calledWith({
      name: "register",
      domain: "scene",
      service: "core",
    });
    expect(setFake).to.have.been.calledWith({
      context,
      claims,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith({
      root: nodeRoot,
      domain,
      service,
      network,
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
