import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake, stub } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const payload = {}; // Revnet registration doesn't require specific payload fields
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
    const revnetRoot = "some-revnet-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(revnetRoot);

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
                id: "RevnetAdmin",
                subject: {
                  root: revnetRoot,
                  domain,
                  service,
                  network,
                },
              },
            ],
          },
        },
        {
          action: "deploy",
          root: revnetRoot,
          context: newContext,
          payload: {
            id: 12345,
            scene: {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          },
        },
        {
          domain: "project",
          action: "deploy",
          root: revnetRoot,
          context: newContext,
          payload: {
            id: 12345,
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
          revnet: {
            root: revnetRoot,
            service,
            network,
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
          root: revnetRoot,
          domain,
          service,
          network,
        },
      },
    });
  });
  it("should return successfully if principal not returned as a reference, and no new context", async () => {
    const revnetRoot = "some-revnet-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(revnetRoot);

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
                id: "RevnetAdmin",
                subject: {
                  root: revnetRoot,
                  domain,
                  service,
                  network,
                },
              },
            ],
          },
        },
        {
          action: "deploy",
          root: revnetRoot,
          context: {
            ...context,
            principal: {
              root: contextPrincipalRoot,
              service: contextPrincipalService,
              network: contextPrincipalNetwork,
            },
          },
          payload: {
            id: 12345,
            scene: {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          },
        },
        {
          domain: "project",
          action: "deploy",
          root: revnetRoot,
          context: {
            ...context,
            principal: {
              root: contextPrincipalRoot,
              service: contextPrincipalService,
              network: contextPrincipalNetwork,
            },
          },
          payload: {
            id: 12345,
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
          revnet: { root: revnetRoot, service, network },
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
          root: revnetRoot,
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
