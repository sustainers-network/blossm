import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, fake, stub, replace, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

let clock;
const now = new Date();
const root = "some-principal-root";
const service = "some-principal-service";
const network = "some-principal-network";
const context = { principal: { root, service, network } };

const sceneRoot = "some-root";
const sceneService = "some-scene-service";
const sceneNetwork = "some-scene-network";

const groupRoot = "some-group-root";
const groupService = "some-group-service";
const groupNetwork = "some-group-network";

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

    const aggregateFake = fake.returns({
        state: {
          group: {
            root: groupRoot,
            service: groupService,
            network: groupNetwork,
          },
        },
      });

    const queryAggregatesFnFake = fake.returns([{
        root: groupRoot,
        service: groupService,
        network: groupNetwork,
      }]);

    const result = await main({
      context,
      payload,
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
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
    expect(aggregateFake).to.have.been.calledWith(sceneRoot);
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: root,
      },
      {
        key: "principals.service",
        value: service,
      },
      {
        key: "principals.network",
        value: network,
      }],
    });
  });
  it("should return correctly if aggregate has already been deleted", async () => {
    const aggregateFake = fake.returns({
      state: { deleted: deps.stringDate() },
    });

    const queryAggregatesFnFake = fake.returns([{
      root: groupRoot,
      service: groupService,
      network: groupNetwork,
    }]);

    const response = await main({
      context,
      payload: { scene: { root: sceneRoot } },
      aggregateFn: aggregateFake,
      queryAggregatesFn: queryAggregatesFnFake,
    });

    expect(response).to.be.undefined;
  });
  it("should throw correctly if scene isn't accessible.", async () => {
    const payload = {
      scene: {
        root: sceneRoot,
        service: sceneService,
        network: sceneNetwork,
      },
    };
    const aggregateFake = fake.returns({
      state: {
        group: {
          root: "bogus",
          service: groupService,
          network: groupNetwork,
        },
      },
    });

    const queryAggregatesFnFake = fake.returns([{
      root: groupRoot,
      service: groupService,
      network: groupNetwork,
    }]);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });
    try {
      await main({ context, payload, aggregateFn: aggregateFake, queryAggregatesFn: queryAggregatesFnFake });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This scene isn't accessible."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if principal has no scenes", async () => {
    const payload = {
      scene: {
        root: sceneRoot,
        service: sceneService,
        network: sceneNetwork,
      },
    };
    const aggregateFake = fake.returns({
      state: {
        group: {
          root: groupRoot,
          service: groupService,
          network: groupNetwork,
        },
      },
    });
    const queryAggregatesFnFake = fake.returns([]);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });
    try {
      await main({ context, payload, aggregateFn: aggregateFake, queryAggregatesFn: queryAggregatesFnFake });
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
