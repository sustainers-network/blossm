const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const root = "some-root";
    const secret = "some-secret";
    const scene = "some-scene";
    const principal = "some-principal";
    const network = "some-network";

    const aggregateFake = fake.returns({
      state: {
        secret,
        scene,
        principal,
        network,
      },
    });
    const result = await main({ root, aggregateFn: aggregateFake });
    expect(aggregateFake).to.have.been.calledWith(root, {
      domain: "key",
      service: "system",
    });
    expect(result).to.deep.equal({
      response: {
        root,
        secret,
        scene,
        principal,
        network,
      },
    });
  });
  it("should return an empty object if not found", async () => {
    const id = "some-id";
    const query = { id };

    const errorMessage = "some-message";
    const error = new Error(errorMessage);
    const aggregateFake = fake.rejects(error);
    try {
      await main({ query, aggregateFn: aggregateFake });

      //shouldn't get called
      expect(1).to.equal(2);
    } catch (err) {
      expect(err.message).to.equal(errorMessage);
    }
  });
});
