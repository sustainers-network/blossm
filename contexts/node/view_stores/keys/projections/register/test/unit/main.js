const { expect } = require("chai").use(require("sinon-chai"));
const { restore } = require("sinon");

const main = require("../../main");

describe("Event handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const network = "some.network";
    const name = "some name";
    const payload = {
      network,
      name,
    };

    const root = "some-root";
    const headers = { root };

    const response = await main({ payload, headers });

    expect(response).to.deep.equal({
      body: {
        name,
        network,
      },
      root,
    });
  });
});
