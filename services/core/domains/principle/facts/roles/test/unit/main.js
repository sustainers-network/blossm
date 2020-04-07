const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const main = require("../../main");

const deps = require("../../deps");

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const network = "some-network";
    const root = "some-root";
    const role = {
      id: "some-id",
      network
    };
    const roles = [
      role,
      {
        id: "some-other-id",
        network: "some-other-network"
      }
    ];

    const aggregateFake = fake.returns({
      state: {
        roles
      }
    });
    const setFake = fake.returns({
      aggregate: aggregateFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);
    const context = {
      network
    };

    const query = {
      root
    };

    const result = await main({ context, query });

    expect(eventStoreFake).to.have.been.calledWith({
      domain: "principle",
      service: "core"
    });
    expect(setFake).to.have.been.calledWith({
      tokenFns: { internal: deps.gcpToken }
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal([role]);
  });
  it("should throw correctly if aggregate not found", async () => {
    const network = "some-network";
    const root = "some-root";

    const aggregateFake = fake();
    const setFake = fake.returns({
      aggregate: aggregateFake
    });
    const eventStoreFake = fake.returns({
      set: setFake
    });
    replace(deps, "eventStore", eventStoreFake);
    const context = {
      network
    };

    const query = {
      root
    };

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake
    });
    try {
      await main({ context, query });

      //shouldn't get called
      expect(1).to.equal(2);
    } catch (err) {
      expect(messageFake).to.have.been.calledWith(
        "This principle doesn't exist."
      );
      expect(err).to.equal(error);
    }
  });
});
