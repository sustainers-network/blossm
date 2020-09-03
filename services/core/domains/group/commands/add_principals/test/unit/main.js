const { expect } = require("chai").use(require("sinon-chai"));
const { replace, restore, fake } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const root = "some-root";
const service = "some-service";
const network = "some-network";

process.env.SERVICE = service;
process.env.NETWORK = network;

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const principal1Root = "principal1-root";
    const principal1Service = "principal1-service";
    const principal1Network = "principal1-network";
    const principal1Role = "principal1-role";

    const principal2Root = "principal2-root";
    const principal2Service = "principal2-service";
    const principal2Network = "principal2-network";
    const principal2Role = "principal2-role";

    const payload = {
      principals: [
        {
          root: principal1Root,
          service: principal1Service,
          network: principal1Network,
          roles: [principal1Role],
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          roles: [principal2Role],
        },
      ],
    };

    const aggregateFake = fake.returns({
      state: {
        networks: [network],
        principals: [],
      },
    });
    const context = {
      network,
    };
    const result = await main({
      payload,
      root,
      aggregateFn: aggregateFake,
      context,
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service,
          network,
          action: "add-roles",
          root: principal1Root,
          payload: {
            roles: [
              {
                id: principal1Role,
                subject: { root, domain: "group", service, network },
              },
            ],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-roles",
          root: principal2Root,
          payload: {
            roles: [
              {
                id: principal2Role,
                subject: { root, domain: "group", service, network },
              },
            ],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-groups",
          root: principal1Root,
          payload: {
            groups: [{ root, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-groups",
          root: principal2Root,
          payload: {
            groups: [{ root, service, network }],
          },
        },
        {
          action: "add-principals",
          root,
          payload: {
            principals: [
              {
                root: principal1Root,
                service: principal1Service,
                network: principal1Network,
              },
              {
                root: principal2Root,
                service: principal2Service,
                network: principal2Network,
              },
            ],
          },
        },
      ],
      response: {},
    });
  });
  it("should return successfully with no principals", async () => {
    const payload = {
      principals: [],
    };

    const aggregateFake = fake.returns({
      state: {
        networks: [network],
        principals: [],
      },
    });
    const context = {
      network,
    };
    const uuid = "some-uuid";
    const uuidFake = fake.returns(uuid);
    replace(deps, "uuid", uuidFake);
    const result = await main({
      payload,
      aggregateFn: aggregateFake,
      context,
    });
    expect(result).to.deep.equal({
      events: [
        {
          action: "add-networks",
          root: uuid,
          payload: {
            networks: [network],
          },
        },
      ],
      response: {
        receipt: {
          group: {
            root: uuid,
            service,
            network,
          },
        },
      },
    });
  });
  it("should return successfully without duplicated", async () => {
    const principal1Root = "principal1-root";
    const principal1Service = "principal1-service";
    const principal1Network = "principal1-network";
    const principal1Role = "principal1-role";

    const principal2Root = "principal2-root";
    const principal2Service = "principal2-service";
    const principal2Network = "principal2-network";
    const principal2Role = "principal2-role";

    const payload = {
      principals: [
        {
          root: principal1Root,
          service: principal1Service,
          network: principal1Network,
          roles: [principal1Role],
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          roles: [principal2Role],
        },
      ],
    };

    const aggregateFake = fake.returns({
      state: {
        networks: [network],
        principals: [
          {
            root: principal2Root,
            service: principal2Service,
            network: principal2Network,
            roles: [principal2Role],
          },
        ],
      },
    });
    const context = {
      network,
    };
    const result = await main({
      payload,
      root,
      aggregateFn: aggregateFake,
      context,
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service,
          network,
          action: "add-roles",
          root: principal1Root,
          payload: {
            roles: [
              {
                id: principal1Role,
                subject: { root, domain: "group", service, network },
              },
            ],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-groups",
          root: principal1Root,
          payload: {
            groups: [{ root, service, network }],
          },
        },
        {
          action: "add-principals",
          root,
          payload: {
            principals: [
              {
                root: principal1Root,
                service: principal1Service,
                network: principal1Network,
              },
            ],
          },
        },
      ],
      response: {},
    });
  });
  it("should return successfully with no events", async () => {
    const principal1Root = "principal1-root";
    const principal1Service = "principal1-service";
    const principal1Network = "principal1-network";
    const principal1Role = "principal1-role";

    const principal2Root = "principal2-root";
    const principal2Service = "principal2-service";
    const principal2Network = "principal2-network";
    const principal2Role = "principal2-role";

    const payload = {
      principals: [
        {
          root: principal1Root,
          service: principal1Service,
          network: principal1Network,
          roles: [principal1Role],
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          roles: [principal2Role],
        },
      ],
    };

    const aggregateFake = fake.returns({
      state: {
        networks: [network],
        principals: [
          {
            root: principal1Root,
            service: principal1Service,
            network: principal1Network,
            role: principal1Role,
          },
          {
            root: principal2Root,
            service: principal2Service,
            network: principal2Network,
            role: principal2Role,
          },
        ],
      },
    });
    const context = {
      network,
    };
    const result = await main({
      payload,
      root,
      aggregateFn: aggregateFake,
      context,
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal();
  });
  it("should return successfully with no root passed in", async () => {
    const uuid = "some-uuid";
    const uuidFake = fake.returns(uuid);
    replace(deps, "uuid", uuidFake);

    const principal1Root = "principal1-root";
    const principal1Service = "principal1-service";
    const principal1Network = "principal1-network";
    const principal1Role = "principal1-role";

    const principal2Root = "principal2-root";
    const principal2Service = "principal2-service";
    const principal2Network = "principal2-network";
    const principal2Role = "principal2-role";

    const payload = {
      principals: [
        {
          root: principal1Root,
          service: principal1Service,
          network: principal1Network,
          roles: [principal1Role],
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          roles: [principal2Role],
        },
      ],
    };

    const result = await main({
      payload,
      context: {
        network,
      },
    });
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service,
          network,
          action: "add-roles",
          root: principal1Root,
          payload: {
            roles: [
              {
                id: principal1Role,
                subject: {
                  root: uuid,
                  domain: "group",
                  service,
                  network,
                },
              },
            ],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-roles",
          root: principal2Root,
          payload: {
            roles: [
              {
                id: principal2Role,
                subject: {
                  root: uuid,
                  domain: "group",
                  service,
                  network,
                },
              },
            ],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-groups",
          root: principal1Root,
          payload: {
            groups: [{ root: uuid, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "add-groups",
          root: principal2Root,
          payload: {
            groups: [{ root: uuid, service, network }],
          },
        },
        {
          action: "add-principals",
          root: uuid,
          payload: {
            principals: [
              {
                root: principal1Root,
                service: principal1Service,
                network: principal1Network,
              },
              {
                root: principal2Root,
                service: principal2Service,
                network: principal2Network,
              },
            ],
          },
        },
        {
          action: "add-networks",
          root: uuid,
          payload: {
            networks: [network],
          },
        },
      ],
      response: {
        receipt: {
          group: {
            root: uuid,
            service,
            network,
          },
        },
      },
    });
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const uuidFake = fake.throws(errorMessage);
    replace(deps, "uuid", uuidFake);
    try {
      await main({
        payload: {
          principals: [],
        },
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw correctly if forbidden", async () => {
    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "forbiddenError", {
      message: messageFake,
    });

    try {
      await main({
        root,
        context: {
          network,
        },
        aggregateFn: fake.returns({
          state: {
            networks: ["bogus"],
          },
        }),
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This group isn't accessible."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly too many principals with root", async () => {
    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });

    const principals = [];
    for (let i = 0; i < 100; i++) {
      principals.push("some");
    }
    try {
      await main({
        root,
        context: {
          network,
        },
        aggregateFn: fake.returns({
          state: {
            networks: [network],
            principals: ["some-thing"],
          },
        }),
        payload: {
          principals,
        },
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        `A group has a max size of 100`,
        {
          info: {
            currentCount: 1,
          },
        }
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly too many principals with no root", async () => {
    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });

    const principals = [];
    for (let i = 0; i < 101; i++) {
      principals.push("some");
    }
    try {
      await main({
        payload: {
          principals,
        },
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        `A group has a max size of 100`,
        {
          info: {
            currentCount: 0,
          },
        }
      );
      expect(e).to.equal(error);
    }
  });
});
