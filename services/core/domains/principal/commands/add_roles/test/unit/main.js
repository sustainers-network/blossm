const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const id = "some-id";
    const root = "some-root";
    const domain = "some-domain";
    const service = "some-service";

    const network = "some-network";

    const payload = {
      roles: [
        {
          id,
          subject: {
            root,
            domain,
            service,
            network,
          },
        },
      ],
    };

    const aggregateFn = fake.returns({ state: { roles: [] } });
    const result = await main({ payload, root, aggregateFn });

    expect(aggregateFn).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-roles",
          payload: {
            roles: [
              {
                id,
                subject: {
                  root,
                  domain,
                  service,
                  network,
                },
              },
            ],
          },
          root,
        },
      ],
    });
  });
  it("should return successfully if no context network and removing duplicates", async () => {
    const id = "some-id";
    const root = "some-root";
    const domain = "some-domain";
    const service = "some-service";
    const network = "some-network";

    const payload = {
      roles: [
        {
          id,
          subject: {
            root,
            domain,
            service,
            network,
          },
        },
        {
          id,
          subject: {
            root: "some-other-root",
            domain,
            service,
            network,
          },
        },
      ],
    };

    const aggregateFn = fake.returns({
      state: {
        roles: [
          {
            id,
            subject: {
              root,
              domain,
              service,
              network,
            },
          },
        ],
      },
    });
    const result = await main({ payload, root, aggregateFn });

    expect(result).to.deep.equal({
      events: [
        {
          action: "add-roles",
          payload: {
            roles: [
              {
                id,
                subject: {
                  root: "some-other-root",
                  domain,
                  service,
                  network,
                },
              },
            ],
          },
          root,
        },
      ],
    });
  });
  it("should return successfully if no roles", async () => {
    const id = "some-id";
    const root = "some-root";
    const domain = "some-domain";
    const service = "some-service";
    const network = "some-network";

    const payload = {
      roles: [
        {
          id,
          subject: {
            root,
            domain,
            service,
            network,
          },
        },
      ],
    };

    const aggregateFn = fake.returns({
      state: {
        roles: [
          {
            id,
            subject: {
              root,
              domain,
              service,
              network,
            },
          },
        ],
      },
    });
    const result = await main({ payload, root, aggregateFn });

    expect(result).to.deep.equal();
  });
});
