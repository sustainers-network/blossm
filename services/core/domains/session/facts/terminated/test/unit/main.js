const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const main = require("../../main");

const deps = require("../../deps");

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
      body: {
        state: { terminated },
      },
    });
    const setFake = fake.returns({
      aggregate: aggregateFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const result = await main({ context: { session } });

    expect(eventStoreFake).to.have.been.calledWith({
      domain,
    });
    expect(setFake).to.have.been.calledWith({
      tokenFns: { internal: deps.gcpToken },
    });
    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(result).to.deep.equal({ response: true });
  });
  it("should return false successfully", async () => {
    const aggregateFake = fake.returns({
      body: {
        state: {},
      },
    });
    const setFake = fake.returns({
      aggregate: aggregateFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const result = await main({ context: { session } });

    expect(eventStoreFake).to.have.been.calledWith({
      domain,
    });
    expect(setFake).to.have.been.calledWith({
      tokenFns: { internal: deps.gcpToken },
    });
    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(result).to.deep.equal({ response: false });
  });
});
