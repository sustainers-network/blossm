const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const network = "some-network";
    const root = "some-root";
    const group = {
      root: "some-group-root",
      network,
    };
    const groups = [
      group,
      {
        root: "some-other-group-root",
        network: "some-other-network",
      },
    ];

    const aggregateFake = fake.returns({
      state: {
        groups,
      },
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({ context, aggregateFn: aggregateFake });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [group] });
  });
});
