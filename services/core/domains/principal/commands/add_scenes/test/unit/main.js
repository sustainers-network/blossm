const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

const network = "some-network";

describe("Command handler unit tests", () => {
  beforeEach(() => {
    delete process.env.NETWORK;
  });
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const root = "some-root";
    const service = "some-service";

    const payload = {
      scenes: [
        {
          root,
          service,
          network,
        },
      ],
    };

    const aggregateFn = fake.returns({ state: { scenes: [] } });
    const result = await main({ payload, root, aggregateFn });
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-scenes",
          payload: {
            scenes: [
              {
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
  it("should return successfully if no context network and removing duplicates", async () => {
    const root = "some-root";
    const service = "some-service";

    const envNetwork = "some-env-network";
    process.env.NETWORK = envNetwork;

    const payload = {
      scenes: [
        {
          root,
          service,
          network,
        },
        {
          root: "some-other-root",
          service,
        },
      ],
    };

    const aggregateFn = fake.returns({
      state: {
        scenes: [
          {
            root,
            service,
            network,
          },
        ],
      },
    });
    const result = await main({ payload, root, aggregateFn });
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-scenes",
          payload: {
            scenes: [
              {
                root: "some-other-root",
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
  it("should return successfully if no new scenes", async () => {
    const root = "some-root";
    const service = "some-service";

    const envNetwork = "some-env-network";
    process.env.NETWORK = envNetwork;

    const payload = {
      scenes: [
        {
          root,
          service,
          network,
        },
      ],
    };

    const aggregateFn = fake.returns({
      state: {
        scenes: [
          {
            root,
            service,
            network,
          },
        ],
      },
    });
    const result = await main({ payload, root, aggregateFn });
    expect(result).to.deep.equal({});
  });
});
