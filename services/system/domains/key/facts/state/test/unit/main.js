const { expect } = require("chai")
  .use(require("sinon-chai"));
const { restore, replace, fake } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const root = "some-root";
    const secret = "some-secret";
    const node = "some-node";
    const principle = "some-principle";
    const network = "some-network";

    const aggregate = {
      state: {
        secret,
        node,
        principle,
        network
      }
    };
    const aggregateFake = fake.returns(aggregate);
    const setFake = fake.returns({
      aggregate: aggregateFake
    })
    const eventStoreFake = fake.returns({
      set: setFake
    })
    replace(deps, "eventStore", eventStoreFake);
    const result = await main({ root });
    expect(eventStoreFake).to.have.been.calledWith({
      domain: "key",
      service: "system"
    });
    expect(setFake).to.have.been.calledWith({ tokenFns: { internal: deps.gcpToken }});
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      root,
      secret,
      node,
      principle,
      network
    });
  });
  it("should return an empty object if not found", async () => {
    const id = "some-id";
    const query = { id };

    const errorMessage = "some-message";
    const error = new Error(errorMessage);
    const aggregateFake = fake.rejects(error);
    const setFake = fake.returns({
      aggregate: aggregateFake
    })
    const eventStoreFake = fake.returns({
      set: setFake
    })
    replace(deps, "eventStore", eventStoreFake);

    try {
      await main({ query });

      //shouldn't get called
      expect(1).to.equal(2);
    } catch (err) {
      expect(err.message).to.equal(errorMessage);
    }
  });
});
