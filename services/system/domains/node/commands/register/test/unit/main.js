import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake, stub } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const payloadNetwork = "some.payload-network";
const payload = { network: payloadNetwork };
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
    const nodeRoot = "some-node-root";
    const sceneRoot = "some-scene-root";
    const sceneService = "some-scene-service";
    const sceneNetwork = "some-scene-network";

    const uuidFake = fake.returns(nodeRoot);

    replace(deps, "uuid", uuidFake);

    const _tokens = "some-tokens";
    const principalRoot = "some-principal-root";
    const principalService = "some-principal-service";
    const principalNetwork = "some-principal-network";

    const groupRoot = "some-group-root";
    const groupService = "some-group-service";
    const groupNetwork = "some-group-network";

    const commandFnFake = stub()
      .onFirstCall()
      .returns({
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
                id: "NodeAdmin",
                subject: {
                  root: nodeRoot,
                  domain: "node",
                  service,
                  network,
                },
              },
            ],
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
        context: newContext,
        receipt: {
          node: { root: nodeRoot, service, network },
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
    expect(commandFnFake).to.have.been.calledOnceWithExactly({
      name: "register",
      domain: "scene",
      service: "core",
      payload: {
        role: "SceneAdmin",
        subject: {
          root: nodeRoot,
          domain,
          service,
          network,
        },
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

    const groupRoot = "some-group-root";
    const groupService = "some-group-service";
    const groupNetwork = "some-group-network";

    const _tokens = "some-tokens";

    const commandFnFake = stub()
      .onFirstCall()
      .returns({
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
                id: "NodeAdmin",
                subject: {
                  root: nodeRoot,
                  domain: "node",
                  service,
                  network,
                },
              },
            ],
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
        receipt: {
          node: { root: nodeRoot, service, network },
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
      tokens: _tokens,
    });
    expect(commandFnFake).to.have.been.calledOnceWithExactly({
      name: "register",
      domain: "scene",
      service: "core",
      payload: {
        role: "SceneAdmin",
        subject: {
          root: nodeRoot,
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
      await main({ payload });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should refuse a network that isn't a plain host name", async () => {
    const commandFn = fake();
    for (const network of [
      "example.com.",
      "example",
      "exa mple.com",
      "example.com/a",
      "a..b",
      "-a.com",
      "ex_ample.com",
      `${"a".repeat(250)}.com`,
    ]) {
      let error;
      try {
        await main({ payload: { network }, context, commandFn });
      } catch (e) {
        error = e;
      }
      expect(error && error.statusCode, network).to.equal(400);
    }
    expect(commandFn).to.not.have.been.called;
  });
});
