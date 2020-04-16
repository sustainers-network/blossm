const { expect } = require("chai").use(require("sinon-chai"));
const { restore } = require("sinon");

const main = require("../../main");

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const id = "some-id";
    const root = "some-root";
    const service = "some-service";

    const network = "some-network";

    const context = {
      network,
    };

    const payload = {
      roles: [
        {
          id,
          root,
          service,
        },
      ],
    };

    const result = await main({ payload, root, context });
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
});
