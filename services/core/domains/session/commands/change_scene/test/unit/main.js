const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, stub, match, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

const newSceneRoot = "some-new-scene-root";
const sceneService = "some-scene-service";
const sceneNetwork = "some-scene-network";

const payload = {
  scene: newSceneRoot,
};

const token = "some-token";
const project = "some-projectl";
const sessionRoot = "some-session-root";
const identity = "some-identity";
const oldDomain = "some-old-domain";
const context = {
  identity,
  session: {
    root: sessionRoot,
  },
  domain: oldDomain,
  [oldDomain]: "some-old-domain",
};
const sceneAggregateRoot = "some-scene-aggregate-root";
const sceneAggregateDomain = "some-scene-aggregate-domain";
const sceneAggregateService = "some-scene-aggregate-service";
const sceneAggregateNetwork = "some-scene-aggregate-network";

const iss = "some-iss";
const aud = "some-aud";
const sub = "some-sub";
const exp = deps.stringFromDate(new Date(deps.fineTimestamp() + 300));
const claims = {
  iss,
  aud,
  sub,
  exp,
};

const service = "some-service";
const network = "some-network";

process.env.GCP_PROJECT = project;
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
  it("should return successfully", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {
          scenes: [
            {
              root: newSceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          ],
        },
      })
      .onSecondCall()
      .returns({ state: {} })
      .onThirdCall()
      .returns({
        state: {
          domain: sceneAggregateDomain,
          service: sceneAggregateService,
          network: sceneAggregateNetwork,
          root: sceneAggregateRoot,
        },
      });

    const result = await main({
      payload,
      context,
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "change-scene",
          payload: {
            scene: {
              root: newSceneRoot,
              service,
              network,
            },
          },
          root: sessionRoot,
        },
      ],
      response: { tokens: [{ network, type: "access", value: token }] },
    });
    expect(aggregateFake).to.have.been.calledWith(sub, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(aggregateFake).to.have.been.calledWith(newSceneRoot, {
      domain: "scene",
    });
    expect(aggregateFake).to.have.callCount(3);
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: sub,
        audience: aud,
        expiresIn: Date.parse(exp) - deps.fineTimestamp(),
      },
      payload: {
        context: {
          identity,
          session: {
            root: sessionRoot,
          },
          scene: {
            root: newSceneRoot,
            service,
            network,
          },
          domain: sceneAggregateDomain,
          [sceneAggregateDomain]: {
            root: sceneAggregateRoot,
            service: sceneAggregateService,
            network: sceneAggregateNetwork,
          },
        },
      },
      signFn: match((fn) => {
        const message = "some-message";
        const response = fn(message);
        return (
          response == signature &&
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "access",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
  });
  it("should return successfully with network in context", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {
          scenes: [
            {
              root: newSceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          ],
        },
      })
      .onSecondCall()
      .returns({ state: {} })
      .onThirdCall()
      .returns({
        state: {
          domain: sceneAggregateDomain,
          service: sceneAggregateService,
          network: sceneAggregateNetwork,
          root: sceneAggregateRoot,
        },
      });

    const contextNetwork = "some-context-network";
    const result = await main({
      payload,
      context: {
        ...context,
        network: contextNetwork,
      },
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "change-scene",
          payload: {
            scene: {
              root: newSceneRoot,
              service,
              network,
            },
          },
          root: sessionRoot,
        },
      ],
      response: {
        tokens: [{ network: contextNetwork, type: "access", value: token }],
      },
    });
    expect(aggregateFake).to.have.been.calledWith(sub, {
      domain: "principal",
    });
    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(aggregateFake).to.have.been.calledWith(newSceneRoot, {
      domain: "scene",
    });
    expect(aggregateFake).to.have.callCount(3);
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: sub,
        audience: aud,
        expiresIn: Date.parse(exp) - deps.fineTimestamp(),
      },
      payload: {
        context: {
          network: contextNetwork,
          identity,
          session: {
            root: sessionRoot,
          },
          scene: {
            root: newSceneRoot,
            service,
            network,
          },
          domain: sceneAggregateDomain,
          [sceneAggregateDomain]: {
            root: sceneAggregateRoot,
            service: sceneAggregateService,
            network: sceneAggregateNetwork,
          },
        },
      },
      signFn: match((fn) => {
        const message = "some-message";
        const response = fn(message);
        return (
          response == signature &&
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "access",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
  });
  it("should throw correctly if scene isnt accessible", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: { scenes: [{ root: "bogus" }] },
      })
      .onSecondCall()
      .returns({ state: {} })
      .onThirdCall()
      .returns({
        state: {
          domain: sceneAggregateDomain,
          service: sceneAggregateService,
          network: sceneAggregateNetwork,
          root: sceneAggregateRoot,
        },
      });

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
      expect(messageFake).to.have.been.calledWith(
        "This scene isn't accessible.",
        {
          info: {
            scene: newSceneRoot,
          },
        }
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if no scenes", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {},
      })
      .onSecondCall()
      .returns({ state: {} })
      .onThirdCall()
      .returns({
        state: {
          domain: sceneAggregateDomain,
          service: sceneAggregateService,
          network: sceneAggregateNetwork,
          root: sceneAggregateRoot,
        },
      });

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
      expect(messageFake).to.have.been.calledWith(
        "This scene isn't accessible.",
        {
          info: {
            scene: newSceneRoot,
          },
        }
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if session terminated", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {
          scenes: [
            {
              root: newSceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          ],
        },
      })
      .onSecondCall()
      .returns({ state: { terminated: deps.stringDate() } })
      .onThirdCall()
      .returns({
        state: {
          domain: sceneAggregateDomain,
          root: sceneAggregateRoot,
        },
      });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });

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
      expect(messageFake).to.have.been.calledWith(
        "This session is terminated."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const errorMessage = "some-error";
    const createJwtFake = fake.rejects(errorMessage);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {
          scenes: [
            {
              root: newSceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          ],
        },
      })
      .onSecondCall()
      .returns({ state: {} })
      .onThirdCall()
      .returns({
        state: {
          domain: sceneAggregateDomain,
          service: sceneAggregateService,
          network: sceneAggregateNetwork,
          root: sceneAggregateRoot,
        },
      });

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
      expect(e.message).to.equal(errorMessage);
    }
  });
});
