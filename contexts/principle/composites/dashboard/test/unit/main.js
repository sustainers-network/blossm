const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, fake, replace, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

describe("Composite unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const query = "some-query";

    const nodes = "some-nodes";
    const readFake = fake.returns({ body: nodes });
    const setFake = fake.returns({
      read: readFake,
    });
    const viewStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "viewStore", viewStoreFake);
    const result = await main({ query, context });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(readFake).to.have.been.calledWith();
    expect(viewStoreFake).to.have.been.calledWith({
      name: "nodes",
      context: "principal",
    });
    expect(result).to.deep.equal({ nodes });
  });
});
