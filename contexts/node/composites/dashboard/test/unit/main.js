const { expect } = require("chai")
  .use(require("sinon-chai"));
const { restore, fake, replace, stub } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

describe("Composite unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const keys = "some-keys";
    const title = "some-title";

    const readFake = stub()
      .onFirstCall()
      .returns({ body: keys })
      .onSecondCall()
      .returns({ body: title });
    const setFake = fake.returns({
      read: readFake,
    });
    const viewStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "viewStore", viewStoreFake);
    const result = await main({ context });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(setFake).to.be.calledTwice;
    expect(readFake).to.have.been.calledWith();
    expect(readFake).to.have.been.calledTwice;
    expect(viewStoreFake).to.have.been.calledWith({
      name: "keys",
      context: "node",
    });
    expect(viewStoreFake).to.have.been.calledWith({
      name: "title",
      context: "node",
    });
    expect(result).to.deep.equal({ keys, title });
  });
});
