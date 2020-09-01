const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake, stub } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const contextNetwork = "some-context-network";

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const role = "some-role";
    const root = "some-root";
    const domain = "some-domain";
    const service = "some-service";
    const network = "some-network";

    const payload = {
      scenes: [
        {
          roles: [role],
          root,
          domain,
          service,
          network,
        },
      ],
    };

    const aggregateFn = stub()
      .onFirstCall()
      .returns({ state: { scenes: [] } })
      .onSecondCall()
      .returns({ state: { network: contextNetwork } });

    const result = await main({
      payload,
      context: { network: contextNetwork },
      root,
      aggregateFn,
    });

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
        {
          action: "add-roles",
          payload: {
            roles: [
              {
                id: role,
                root,
                domain: "scene",
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
    const role = "some-role";
    const root = "some-root";
    const service = "some-service";
    const network = "some-network";

    const payload = {
      scenes: [
        {
          root,
          service,
          network,
        },
        {
          roles: [role],
          root: "some-other-root",
          service,
          network,
        },
      ],
    };

    const aggregateFn = stub()
      .onFirstCall()
      .returns({
        state: {
          scenes: [
            {
              root,
              service,
              network,
            },
          ],
        },
      })
      .onSecondCall()
      .returns({
        state: {
          network: contextNetwork,
        },
      });
    const result = await main({
      payload,
      context: { network: contextNetwork },
      root,
      aggregateFn,
    });
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-scenes",
          payload: {
            scenes: [
              {
                root: "some-other-root",
                service,
                network,
              },
            ],
          },
          root,
        },
        {
          action: "add-roles",
          payload: {
            roles: [
              {
                id: role,
                root: "some-other-root",
                domain: "scene",
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
  it("should return successfully if no new scenes", async () => {
    const root = "some-root";
    const service = "some-service";
    const network = "some-network";

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
    expect(result).to.deep.equal();
  });
  it("should throw if wrong network", async () => {
    const role = "some-role";
    const root = "some-root";
    const service = "some-service";
    const network = "some-network";

    const payload = {
      scenes: [
        {
          roles: [role],
          root,
          service,
          network,
        },
      ],
    };

    const aggregateFn = stub()
      .onFirstCall()
      .returns({ state: { scenes: [] } })
      .onSecondCall()
      .returns({ state: { network: contextNetwork } });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });

    try {
      await main({
        payload,
        context: { network: "bogus" },
        root,
        aggregateFn,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This scene isn't accessible."
      );
      expect(e).to.equal(error);
    }
  });
});
