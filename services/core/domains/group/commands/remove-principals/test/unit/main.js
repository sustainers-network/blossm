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
          role: principal1Role,
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          role: principal2Role,
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
    expect(result).to.deep.equal({
      events: [
        {
          domain: "principal",
          service,
          network,
          action: "remove-roles",
          root: principal1Root,
          payload: {
            roles: [{ id: principal1Role, root, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "remove-roles",
          root: principal2Root,
          payload: {
            roles: [{ id: principal2Role, root, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "remove-groups",
          root: principal1Root,
          payload: {
            groups: [{ root, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "remove-groups",
          root: principal2Root,
          payload: {
            groups: [{ root, service, network }],
          },
        },
        {
          action: "remove-principals",
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
    });
  });
  it("should return successfully with no duplicates", async () => {
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
          role: principal1Role,
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          role: principal2Role,
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
          action: "remove-roles",
          root: principal1Root,
          payload: {
            roles: [{ id: principal1Role, root, service, network }],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "remove-groups",
          root: principal1Root,
          payload: {
            groups: [{ root, service, network }],
          },
        },
        {
          action: "remove-principals",
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
          role: principal1Role,
        },
        {
          root: principal2Root,
          service: principal2Service,
          network: principal2Network,
          role: principal2Role,
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
    expect(result).to.deep.equal();
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const aggregateFake = fake.throws(errorMessage);
    try {
      await main({
        payload: {
          principals: [],
        },
        aggregateFn: aggregateFake,
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
});
