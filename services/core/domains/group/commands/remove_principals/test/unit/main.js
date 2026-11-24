import * as chai from "chai";
import sinonChai from "sinon-chai";
import { replace, restore, fake } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const root = "some-root";
const domain = "some-domain";
const service = "some-service";
const network = "some-network";

process.env.DOMAIN = domain;
process.env.SERVICE = service;
process.env.NETWORK = network;

// The calling principal, as it appears in the session context.
const caller = {
  root: "caller-root",
  service: "caller-service",
  network: "caller-network",
};

const adminRole = {
  id: "GroupAdmin",
  subject: { root, domain: "group", service, network },
};

// The real aggregateFn is async and reads the store named by its options.
// `roles` are the caller's. `rolesByRoot` holds other principals' roles.
const aggregateFnFake = ({ group, roles = [adminRole], rolesByRoot = {} }) =>
  fake(async (aggregateRoot, { domain } = {}) =>
    domain == "principal"
      ? aggregateRoot == caller.root
        ? { state: { roles } }
        : rolesByRoot[aggregateRoot] && {
            state: { roles: rolesByRoot[aggregateRoot] },
          }
      : { state: group }
  );

const memberRole = { ...adminRole, id: "GroupMember" };
// Roles that must stay with a principal removed from this group.
const otherRoles = [
  { ...adminRole, subject: { ...adminRole.subject, root: "other-root" } },
  { ...adminRole, subject: { ...adminRole.subject, domain: "scene" } },
  { ...adminRole, subject: { ...adminRole.subject, service: "other-service" } },
  { ...adminRole, subject: { ...adminRole.subject, network: "other-network" } },
];

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

    const aggregateFake = aggregateFnFake({
      rolesByRoot: {
        [principal1Root]: [adminRole, ...otherRoles, memberRole],
      },
      group: {
        networks: [network],
        principals: [
          caller,
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
      principal: caller,
    };
    const result = await main({
      payload,
      root,
      aggregateFn: aggregateFake,
      context,
    });
    expect(aggregateFake).to.have.been.calledWith(principal1Root, {
      domain: "principal",
      notFoundThrows: false,
    });
    expect(aggregateFake).to.have.been.calledWith(caller.root, {
      domain: "principal",
      notFoundThrows: false,
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
            roles: [adminRole, memberRole],
          },
        },
        {
          domain: "principal",
          service,
          network,
          action: "remove-roles",
          root: principal2Root,
          payload: {
            roles: [],
          },
        },
        // {
        //   domain: "principal",
        //   service,
        //   network,
        //   action: "remove-groups",
        //   root: principal1Root,
        //   payload: {
        //     groups: [{ root, service, network }],
        //   },
        // },
        // {
        //   domain: "principal",
        //   service,
        //   network,
        //   action: "remove-groups",
        //   root: principal2Root,
        //   payload: {
        //     groups: [{ root, service, network }],
        //   },
        // },
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

    const aggregateFake = aggregateFnFake({
      rolesByRoot: { [principal1Root]: [memberRole] },
      group: {
        networks: [network],
        principals: [
          caller,
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
      principal: caller,
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
            roles: [memberRole],
          },
        },
        // {
        //   domain: "principal",
        //   service,
        //   network,
        //   action: "remove-groups",
        //   root: principal1Root,
        //   payload: {
        //     groups: [{ root, service, network }],
        //   },
        // },
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

    const aggregateFake = aggregateFnFake({
      group: {
        networks: [network],
        principals: [caller],
      },
    });
    const context = {
      network,
      principal: caller,
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
  const refusedCases = [
    {
      name: "a member without the GroupAdmin role",
      context: { network, principal: caller },
      principals: [caller],
      roles: [{ ...adminRole, id: "GroupMember" }],
    },
    {
      name: "a GroupAdmin of another group",
      context: { network, principal: caller },
      principals: [caller],
      roles: [
        { ...adminRole, subject: { ...adminRole.subject, root: "other-root" } },
      ],
    },
    {
      name: "a principal that holds the role but is not a member",
      context: { network, principal: caller },
      principals: [],
      roles: [adminRole],
    },
    {
      name: "a session with no principal",
      context: { network },
      principals: [caller],
      roles: [adminRole],
    },
  ];
  for (const { name, context, principals, roles } of refusedCases) {
    it(`should refuse ${name}`, async () => {
      const error = "some-error";
      const messageFake = fake.returns(error);
      replace(deps, "forbiddenError", {
        message: messageFake,
      });
      const target = {
        root: "target-root",
        service: "target-service",
        network: "target-network",
      };
      try {
        await main({
          root,
          context,
          payload: { principals: [target] },
          aggregateFn: aggregateFnFake({
            group: { networks: [network], principals: [...principals, target] },
            roles,
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
  }
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
