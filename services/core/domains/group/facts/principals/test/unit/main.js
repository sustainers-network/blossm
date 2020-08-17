const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const root = "some-root";
    const principals = [];
    const returnedPrincipals = [];

    for (let i = 0; i < 102; i++) {
      principals.push(`some-principal${i}`);
      if (i < 100) returnedPrincipals.push(`some-principal${i}`);
    }

    const aggregateFake = fake.returns({
      state: {
        principals,
      },
    });

    const result = await main({ root, aggregateFn: aggregateFake });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: returnedPrincipals });
  });
  it("should stream successfully", async () => {
    const root = "some-root";
    const principals = [];

    for (let i = 0; i < 102; i++) {
      principals.push(`some-principal${i}`);
    }

    const aggregateFake = fake.returns({
      state: {
        principals,
      },
    });
    const streamFake = fake();

    await main({
      root,
      aggregateFn: aggregateFake,
      streamFn: streamFake,
    });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(streamFake).to.have.callCount(102);
    for (const principal of principals) {
      expect(streamFake).to.have.been.calledWith(principal);
    }
  });
});
