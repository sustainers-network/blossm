import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const service = "some-service";
const network = "some.network";
process.env.SERVICE = service;
process.env.NETWORK = network;

const root = "some-group-root";
const who = (name) => ({ root: `${name}-root`, service, network });
const admin = who("admin");
const otherAdmin = who("other-admin");
const member = who("member");
const outsider = who("outsider");
const role = (id, groupRoot = root, domain = "group") => ({
  id,
  subject: { root: groupRoot, domain, service, network },
});
const otherRoles = [
  role("GroupAdmin", "some-other-group-root"),
  role("SceneAdmin", root, "scene"),
];

const stores = ({ networks = [network], roles = {} } = {}) => {
  const held = {
    [admin.root]: [role("GroupAdmin")],
    [otherAdmin.root]: [role("GroupAdmin"), role("GroupMember"), ...otherRoles],
    [member.root]: [role("GroupMember"), ...otherRoles],
    ...roles,
  };
  return fake(async (aggregateRoot, { domain } = {}) =>
    domain == "principal"
      ? held[aggregateRoot] && { state: { roles: held[aggregateRoot] } }
      : {
          state: { principals: [admin, otherAdmin, member], networks },
          lastEventNumber: 7,
        }
  );
};
const run = (caller, principals, options) =>
  main({
    payload: { principals },
    root,
    context: { network, principal: caller },
    aggregateFn: stores(options),
  });
const statusCode = async (...args) => {
  try {
    await run(...args);
  } catch (e) {
    return e.statusCode;
  }
};
const removed = (principal, ids = ["GroupAdmin", "GroupMember"]) => [
  {
    domain: "principal",
    service,
    network,
    action: "remove-roles",
    root: principal.root,
    payload: { roles: ids.map((id) => role(id)) },
  },
  // On the group's next event number, so concurrent removals can't both land.
  {
    action: "remove-principals",
    root,
    correctNumber: 8,
    payload: { principals: [principal] },
  },
];

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should let an admin remove a member, with every role for this group and no other", async () => {
    expect((await run(admin, [member])).events).to.deep.equal(
      removed(member)
    );
  });
  it("should let an admin remove another admin", async () => {
    expect((await run(admin, [otherAdmin])).events).to.deep.equal(
      removed(otherAdmin)
    );
  });
  it("should let a member leave", async () => {
    expect((await run(member, [member])).events).to.deep.equal(
      removed(member)
    );
  });
  it("should return nothing if the principal isn't in the group", async () => {
    expect(await run(admin, [outsider])).to.be.undefined;
  });
  it("should refuse an admin removing themselves", async () => {
    expect(await statusCode(admin, [admin])).to.equal(403);
    expect(await statusCode(admin, [member, admin])).to.equal(403);
  });
  it("should refuse a member removing someone else", async () => {
    expect(await statusCode(member, [admin])).to.equal(403);
    expect(await statusCode(member, [member, otherAdmin])).to.equal(403);
  });
  it("should refuse a caller that isn't a member", async () => {
    expect(await statusCode(outsider, [member])).to.equal(403);
    expect(await statusCode(outsider, [outsider])).to.equal(403);
    // Holding the role without being a member isn't enough.
    expect(
      await statusCode(outsider, [member], {
        roles: { [outsider.root]: [role("GroupAdmin")] },
      })
    ).to.equal(403);
  });
  it("should refuse a caller on a network the group isn't in", async () => {
    expect(
      await statusCode(admin, [member], { networks: ["some.other-network"] })
    ).to.equal(403);
    expect(await statusCode(admin, [member], { networks: null })).to.equal(
      403
    );
  });
});
