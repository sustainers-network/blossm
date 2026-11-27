import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const node = { root: "some-node-root", service: "system", network: "some.network" };
const context = { domain: "node", node };
const network = "some.node-network";
const aggregateFn = (state = {}) =>
  fake.resolves({ lastEventNumber: 0, state: { network, ...state } });
const run = async (records, options = {}) => {
  const resolveTxt =
    records instanceof Error ? fake.rejects(records) : fake.resolves(records);
  replace(deps, "resolveTxt", resolveTxt);
  let result, error;
  try {
    result = await main({
      context,
      aggregateFn: aggregateFn(options.state),
      ...options.args,
    });
  } catch (e) {
    error = e;
  }
  return { result, error, resolveTxt };
};

let clock;
describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(Date.now());
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    clock.restore();
    restore();
    delete process.env.NODE_ENV;
  });
  it("should verify a node its network's DNS names", async () => {
    const { result, resolveTxt } = await run([
      ["v=spf1 -all"],
      // A value split in two chunks.
      ["blossm-node=some-", "node-root"],
    ]);
    expect(resolveTxt).to.have.been.calledWith("_blossm.some.node-network");
    expect(result).to.deep.equal({
      events: [
        {
          action: "verify",
          root: node.root,
          correctNumber: 1,
          payload: { verified: new Date().toISOString() },
        },
      ],
    });
  });
  it("should refuse when the DNS names another node, nothing, or fails", async () => {
    for (const records of [
      [["blossm-node=some-other-node-root"]],
      [["blossm-node=some-node-root-and-more"]],
      [],
      new Error("ENOTFOUND"),
    ]) {
      const { error } = await run(records);
      expect(error.statusCode).to.equal(400);
      expect(error.toJSON().info).to.deep.equal({
        record: "_blossm.some.node-network",
        type: "TXT",
        value: "blossm-node=some-node-root",
      });
      restore();
    }
  });
  it("should return nothing if the node is already verified", async () => {
    const { result, resolveTxt } = await run([], {
      state: { verified: "2020-01-01T00:00:00.000Z" },
    });
    expect(result).to.be.undefined;
    expect(resolveTxt).to.not.have.been.called;
  });
  it("should refuse a session that isn't in a node", async () => {
    for (const ctx of [{ node }, { domain: "node" }, { domain: "scene", node }]) {
      const { error } = await run([], { args: { context: ctx } });
      expect(error.statusCode).to.equal(403);
      restore();
    }
  });
  it("should skip the lookup on a local network", async () => {
    process.env.NODE_ENV = "local";
    const { result, resolveTxt } = await run([]);
    expect(resolveTxt).to.not.have.been.called;
    expect(result.events[0].action).to.equal("verify");
  });
});
