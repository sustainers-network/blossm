const { expect } = require("chai").use(require("sinon-chai"));
const { restore } = require("sinon");

const main = require("../../main");

describe("Command handler unit tests", () => {
  beforeEach(() => {
    delete process.env.NETWORK;
  });
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const id = "some-id";
    const root = "some-root";
    const service = "some-service";

    const network = "some-network";

    const payload = {
      roles: [
        {
          id,
          root,
          service,
          network,
        },
      ],
    };

    const result = await main({ payload, root });
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-roles",
          payload: {
            roles: [
              {
                id,
                root,
                service,
                network,
              },
            ],
          },
          root,
        },
      ],
    });
  });
  it("should return successfully if no context network", async () => {
    const id = "some-id";
    const root = "some-root";
    const service = "some-service";

    const envNetwork = "some-env-network";
    process.env.NETWORK = envNetwork;

    const payload = {
      roles: [
        {
          id,
          root,
          service,
        },
      ],
    };

    const result = await main({ payload, root });
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-roles",
          payload: {
            roles: [
              {
                id,
                root,
                service,
                network: envNetwork,
              },
            ],
          },
          root,
        },
      ],
    });
  });
});
