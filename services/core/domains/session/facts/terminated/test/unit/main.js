const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

const sessionRoot = "some-session-root";
const session = {
  root: sessionRoot,
};

const domain = "some-domain";

process.env.DOMAIN = domain;

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const terminated = "some-terminated";

    const aggregateFake = fake.returns({
      state: { terminated },
    });

    const result = await main({
      context: { session },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(result).to.deep.equal({ response: true });
  });
  it("should return false successfully", async () => {
    const aggregateFake = fake.returns({
      state: {},
    });

    const result = await main({
      context: { session },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(result).to.deep.equal({ response: false });
  });
});
