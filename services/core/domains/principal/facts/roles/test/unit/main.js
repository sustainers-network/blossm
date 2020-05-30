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
      network,
    };
    const roles = [
      role,
      {
        id: "some-other-id",
        network: "some-other-network",
      },
    ];

    const aggregateFake = fake.returns({
      body: {
        state: {
          roles,
        },
      },
    });
    const setFake = fake.returns({
      aggregate: aggregateFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);
    const context = {
      network,
    };

    const result = await main({ context, root });

    expect(eventStoreFake).to.have.been.calledWith({
      domain: "principal",
      service: "core",
    });
    expect(setFake).to.have.been.calledWith({
      tokenFns: { internal: deps.gcpToken },
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [role] });
  });
});
