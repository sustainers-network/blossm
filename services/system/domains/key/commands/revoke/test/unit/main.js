import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake, useFakeTimers } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const root = "some-key-root";
const node = { root: "some-node-root", service: "system", network: "some.network" };
const context = { domain: "node", node };
const principal = { root: "some-key-principal-root", service: "core", network: "some.network" };
const key = (state = {}) => ({
  lastEventNumber: 0,
  state: { domain: { ...node, name: "node" }, principal, ...state },
});
const statusCode = async (args) => {
  try {
    await main(args);
  } catch (e) {
    return e.statusCode;
  }
};

let clock;
describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(Date.now());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should revoke the key and take away its role", async () => {
    const aggregateFn = fake.resolves(key());
    const result = await main({ root, context, aggregateFn });

    expect(aggregateFn).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      events: [
        {
          action: "revoke",
          root,
          correctNumber: 1,
          payload: { revoked: new Date().toISOString() },
        },
        {
          domain: "principal",
          service: "core",
          action: "remove-roles",
          root: principal.root,
          payload: {
            roles: [
              { id: "NodeNetwork", subject: { ...node, domain: "node" } },
            ],
          },
        },
      ],
    });
  });
  it("should only resend the role removal if the key is already revoked", async () => {
    // An earlier attempt can have revoked the key and failed before the
    // removal was queued.
    const aggregateFn = fake.resolves(key({ revoked: "2020-01-01T00:00:00.000Z" }));
    const { events } = await main({ root, context, aggregateFn });
    expect(events.map((event) => event.action)).to.deep.equal(["remove-roles"]);
    expect(events[0].payload.roles[0].id).to.equal("NodeNetwork");
    expect(events[0].correctNumber).to.be.undefined;
  });
  it("should refuse a key of another node, or one with no owner", async () => {
    for (const state of [
      { domain: { ...node, name: "node", root: "some-other-node-root" } },
      { domain: { ...node, name: "node", network: "some.other-network" } },
      { domain: { ...node, name: "store" } },
      { domain: undefined },
    ])
      expect(
        await statusCode({ root, context, aggregateFn: fake.resolves(key(state)) })
      ).to.equal(403);
  });
  it("should refuse a session that isn't in a node", async () => {
    const aggregateFn = fake.resolves(key());
    expect(await statusCode({ root, context: { node }, aggregateFn })).to.equal(403);
    expect(
      await statusCode({ root, context: { domain: "node" }, aggregateFn })
    ).to.equal(403);
    expect(aggregateFn).to.not.have.been.called;
  });
});
