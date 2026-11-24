import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const service = "some-service";
const network = "some.network";
process.env.SERVICE = service;
process.env.NETWORK = network;

const root = "some-group-root";
const who = (name) => ({ root: `${name}-root`, service, network });
const admin = who("admin");
const member = who("member");
const outsider = who("outsider");
const context = { network, principal: admin };
const role = (id, groupRoot = root) => ({
  id,
  subject: { root: groupRoot, domain: "group", service, network },
});
const addRoles = (principal, ids, groupRoot = root) => ({
  domain: "principal",
  service,
  network,
  action: "add-roles",
  root: principal.root,
  payload: { roles: ids.map((id) => role(id, groupRoot)) },
});

// A group with an admin and a member, and each principal's roles.
const stores = ({ principals = [admin, member], networks = [network], roles = {} } = {}) => {
  const held = {
    [admin.root]: [role("GroupAdmin")],
    [member.root]: [role("GroupMember")],
    ...roles,
  };
  return fake(async (aggregateRoot, { domain } = {}) =>
    domain == "principal"
      ? held[aggregateRoot] && { state: { roles: held[aggregateRoot] } }
      : { state: { principals, networks } }
  );
};
const statusCode = async (args) => {
  try {
    await main(args);
  } catch (e) {
    return e.statusCode;
  }
};

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should add a principal to a group the caller administers", async () => {
    const result = await main({
      payload: { principals: [{ ...outsider, roles: ["GroupMember"] }] },
      root,
      context,
      aggregateFn: stores(),
    });

    expect(result).to.deep.equal({
      events: [
        addRoles(outsider, ["GroupMember"]),
        { action: "add-principals", root, payload: { principals: [outsider] } },
      ],
      response: {},
    });
  });
  it("should give a member only the roles they don't hold yet", async () => {
    const result = await main({
      payload: {
        principals: [{ ...member, roles: ["GroupMember", "GroupAdmin"] }],
      },
      root,
      context,
      aggregateFn: stores(),
    });

    expect(result.events).to.deep.equal([addRoles(member, ["GroupAdmin"])]);
  });
  it("should return nothing if there is nothing to change", async () => {
    const result = await main({
      payload: { principals: [{ ...member, roles: ["GroupMember"] }] },
      root,
      context,
      aggregateFn: stores(),
    });

    expect(result).to.be.undefined;
  });
  for (const [name, caller, options] of [
    ["a member that isn't an admin", member],
    ["an outsider adding itself", outsider],
    ["an admin of another group", outsider, { roles: { [outsider.root]: [role("GroupAdmin", "some-other-group-root")] } }],
    ["a role holder that is no longer a member", outsider, { roles: { [outsider.root]: [role("GroupAdmin")] } }],
    ["a caller on a network the group isn't in", admin, { networks: ["some.other-network"] }],
    ["a group with no networks", admin, { networks: null }],
  ])
    it(`should refuse ${name}`, async () => {
      expect(
        await statusCode({
          payload: { principals: [{ ...outsider, roles: ["GroupAdmin"] }] },
          root,
          context: { network, principal: caller },
          aggregateFn: stores(options),
        })
      ).to.equal(403);
    });
  it("should make the creator an admin of a new group", async () => {
    const groupRoot = "some-new-group-root";
    replace(deps, "uuid", fake.returns(groupRoot));
    const aggregateFn = fake();
    const result = await main({
      payload: { principals: [{ ...outsider, roles: ["GroupMember"] }] },
      context,
      aggregateFn,
    });

    expect(aggregateFn).to.not.have.been.called;
    expect(result).to.deep.equal({
      events: [
        addRoles(admin, ["GroupAdmin"], groupRoot),
        addRoles(outsider, ["GroupMember"], groupRoot),
        {
          action: "add-principals",
          root: groupRoot,
          payload: { principals: [admin, outsider] },
        },
        {
          action: "add-networks",
          root: groupRoot,
          payload: { networks: [network] },
        },
      ],
      response: {
        receipt: { group: { root: groupRoot, service, network } },
      },
    });
  });
  it("should keep the creator an admin when the payload lists them as a member", async () => {
    const groupRoot = "some-new-group-root";
    replace(deps, "uuid", fake.returns(groupRoot));
    const result = await main({
      payload: { principals: [{ ...admin, roles: ["GroupMember"] }] },
      context,
      aggregateFn: fake(),
    });

    expect(result.events[0]).to.deep.equal(
      addRoles(admin, ["GroupAdmin", "GroupMember"], groupRoot)
    );
    expect(result.events[1].payload.principals).to.deep.equal([admin]);
  });
  it("should refuse to grow a group past the limit", async () => {
    const principals = [admin, ...[...Array(99)].map((_, i) => who(`m${i}`))];
    const aggregateFn = stores({ principals });
    const args = { root, context, aggregateFn };
    // Promoting a member of a full group is fine.
    expect(
      await statusCode({
        ...args,
        payload: { principals: [{ ...who("m0"), roles: ["GroupAdmin"] }] },
      })
    ).to.be.undefined;
    expect(
      await statusCode({
        ...args,
        payload: { principals: [{ ...outsider, roles: ["GroupMember"] }] },
      })
    ).to.equal(400);
  });
  it("should refuse a new group past the limit", async () => {
    expect(
      await statusCode({
        payload: {
          principals: [...Array(100)].map((_, i) => ({
            ...who(`m${i}`),
            roles: ["GroupMember"],
          })),
        },
        context,
        aggregateFn: fake(),
      })
    ).to.equal(400);
  });
});
