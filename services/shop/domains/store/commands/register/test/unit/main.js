import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake, stub } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const payloadName = "some-store-name";
const payloadTicker = "some-ticker";
const payload = { name: payloadName, ticker: payloadTicker };
const account = "some-account";
const context = { account };

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
    const storeRoot = "some-store-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(storeRoot);

    replace(deps, "uuid", uuidFake);

    const _tokens = "some-tokens";
    const principalRoot = "some-principal-root";
    const principalService = "some-principal-service";
    const principalNetwork = "some-principal-network";

    const groupRoot = "some-group-root";
    const groupService = "some-group-service";
    const groupNetwork = "some-group-network";

    const commandFnFake = stub().returns({
      body: {
        _tokens,
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
          group: {
            root: groupRoot,
            service: groupService,
            network: groupNetwork,
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
            roles: [
              {
                id: "StoreAdmin",
                subject: {
                  root: storeRoot,
                  domain: "store",
                  service,
                  network,
                },
              },
            ],
          },
        },
        {
          action: "register",
          root: storeRoot,
          context: newContext,
          payload: {
            name: payloadName,
            ticker: payloadTicker,
            scene: {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          },
        },
      ],
      response: {
        context: newContext,
        receipt: {
          shop: { root: storeRoot, service, network },
          principal: {
            root: principalRoot,
            service: principalService,
            network: principalNetwork,
          },
          group: {
            root: groupRoot,
            service: groupService,
            network: groupNetwork,
          },
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
      tokens: _tokens,
    });
    expect(commandFnFake.getCall(0)).to.have.been.calledWith({
      name: "register",
      domain: "scene",
      service: "core",
      payload: {
        role: "SceneAdmin",
        subject: {
          root: storeRoot,
          domain,
          service,
          network,
        },
      },
    });
  });
  it("should return successfully if principal not returned as a reference, and no new context", async () => {
    const storeRoot = "some-store-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(storeRoot);

    replace(deps, "uuid", uuidFake);

    const _tokens = "some-tokens";

    const groupRoot = "some-group-root";
    const groupService = "some-group-service";
    const groupNetwork = "some-group-network";

    const commandFnFake = stub().returns({
      body: {
        _tokens,
        receipt: {
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
          group: {
            root: groupRoot,
            service: groupService,
            network: groupNetwork,
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
            roles: [
              {
                id: "StoreAdmin",
                subject: {
                  root: storeRoot,
                  domain: "store",
                  service,
                  network,
                },
              },
            ],
          },
        },
        {
          action: "register",
          root: storeRoot,
          context: {
            ...context,
            principal: {
              root: contextPrincipalRoot,
              service: contextPrincipalService,
              network: contextPrincipalNetwork,
            },
          },
          payload: {
            name: payloadName,
            ticker: payloadTicker,
            scene: {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          },
        },
      ],
      response: {
        receipt: {
          shop: { root: storeRoot, service, network },
          group: {
            root: groupRoot,
            service: groupService,
            network: groupNetwork,
          },
          scene: {
            root: sceneRoot,
            service: sceneService,
            network: sceneNetwork,
          },
        },
      },
      tokens: _tokens,
    });
    expect(commandFnFake.getCall(0)).to.have.been.calledWith({
      name: "register",
      domain: "scene",
      service: "core",
      payload: {
        role: "SceneAdmin",
        subject: {
          root: storeRoot,
          domain,
          service,
          network,
        },
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
