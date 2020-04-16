const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore } = require("sinon");

const main = require("../../main");

describe("Event handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const network = "some.network";
    const payload = {
      network,
      scene: {
        root: "some-scene-root",
        service: "some-scene-service",
        network: "some-scene.network",
      },
    };

    const root = "some-root";
    const headers = { root };

    const response = await main({ payload, headers });

    expect(response).to.deep.equal({
      body: {
        scene: "some-scene-root",
        network: "some.network",
      },
      root,
    });
  });
});
