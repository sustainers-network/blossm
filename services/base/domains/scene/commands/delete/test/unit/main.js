const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, fake, stub, replace, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();
const root = "some-principal-root";
const context = { principal: { root } };

const sceneRoot = "some-root";
const sceneService = "some-scene-service";
const sceneNetwork = "some-scene-network";

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const payload = {
      scene: {
        root: sceneRoot,
        service: sceneService,
        network: sceneNetwork,
      },
    };

    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {},
      })
      .onSecondCall()
      .returns({
        state: {
          scenes: [
            {
              root: sceneRoot,
              service: sceneService,
              network: sceneNetwork,
            },
          ],
        },
      });
    const result = await main({
      context,
      payload,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          root: sceneRoot,
          action: "delete",
          payload: {
            deleted: deps.stringDate(),
          },
        },
      ],
    });
    expect(aggregateFake.getCall(0)).to.have.been.calledWith(sceneRoot);
    expect(aggregateFake.getCall(1)).to.have.been.calledWith(root, {
      domain: "principal",
      service: "base",
    });
  });
  it("should throw correctly if aggregate has already been deleted", async () => {
    const aggregateFake = fake.returns({
      state: { deleted: deps.stringDate() },
    });
    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({
        context,
        payload: { scene: { root: sceneRoot } },
        aggregateFn: aggregateFake,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This scene has already been deleted."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if scene isn't accessible.", async () => {
    const payload = {
      scene: {
        root: sceneRoot,
        service: sceneService,
        network: sceneNetwork,
      },
    };
    const aggregateFake = stub()
      .onFirstCall()
      .returns({
        state: {},
      })
      .onSecondCall()
      .returns({
        state: {
          scenes: [
            {
              root: "bogus",
              service: sceneService,
              network: sceneNetwork,
            },
          ],
        },
      });
    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });
    try {
      await main({ context, payload, aggregateFn: aggregateFake });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This scene isn't accessible."
      );
      expect(e).to.equal(error);
    }
  });
});
