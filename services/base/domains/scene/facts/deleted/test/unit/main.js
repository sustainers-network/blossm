const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

const sceneRoot = "some-scene-root";
const scene = {
  root: sceneRoot,
};

const domain = "some-domain";

process.env.DOMAIN = domain;

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const deleted = "some-deleted";

    const aggregateFake = fake.returns({
      state: { deleted },
    });

    const result = await main({
      context: { scene },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sceneRoot);
    expect(result).to.deep.equal({ response: true });
  });
  it("should return false successfully", async () => {
    const aggregateFake = fake.returns({
      state: {},
    });

    const result = await main({
      context: { scene },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sceneRoot);
    expect(result).to.deep.equal({ response: false });
  });
});
