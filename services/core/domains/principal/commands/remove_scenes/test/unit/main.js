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
    const roleId = "some-role-id";
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

    const aggregateFn = stub()
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
      .returns({ state: { network: contextNetwork } });

    const role = {
      id: roleId,
      root,
    };
    const readFactFnFake = fake.returns({ body: [role] });

    const result = await main({
      payload,
      context: {
        network: contextNetwork,
      },
      root,
      aggregateFn,
      readFactFn: readFactFnFake,
    });

    expect(readFactFnFake).to.have.been.calledWith({
      name: "roles",
      domain: "principal",
      service: "core",
      query: {
        includes: [
          {
            root,
            domain: "scene",
            service,
          },
        ],
      },
    });
    expect(result).to.deep.equal({
      events: [
        {
          action: "remove-scenes",
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
          action: "remove-roles",
          payload: {
            roles: [
              {
                id: roleId,
                subject: {
                  root,
                  domain: "scene",
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
  it("should return successfully with no duplicates", async () => {
    const roleId = "some-role-id";
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
          root: "some-other-scene-root",
          service,
          network,
        },
      ],
    };

    const aggregateFn = stub()
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
      .returns({ state: { network: contextNetwork } });

    const role = {
      id: roleId,
      root,
    };
    const readFactFnFake = fake.returns({ body: [role] });

    const result = await main({
      payload,
      context: {
        network: contextNetwork,
      },
      root,
      aggregateFn,
      readFactFn: readFactFnFake,
    });

    expect(readFactFnFake).to.have.been.calledWith({
      name: "roles",
      domain: "principal",
      service: "core",
      query: {
        includes: [
          {
            root,
            domain: "scene",
            service,
          },
        ],
      },
    });
    expect(result).to.deep.equal({
      events: [
        {
          action: "remove-scenes",
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
          action: "remove-roles",
          payload: {
            roles: [
              {
                id: roleId,
                subject: {
                  root,
                  domain: "scene",
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
  it("should return successfully if no existing scenes", async () => {
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
        scenes: [],
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
          root,
          service,
          network,
        },
      ],
    };

    const aggregateFn = stub()
      .returns({
        state: {
          scenes: [
            {
              role,
              root,
              service,
              network,
            },
          ],
        },
      })
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
