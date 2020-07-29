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
      state: {
        roles,
      },
    });
    const context = {
      network,
    };

    const result = await main({ context, root, aggregateFn: aggregateFake });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [role] });
  });
});
