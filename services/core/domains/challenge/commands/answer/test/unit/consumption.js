import assert from "node:assert/strict";
import commandPost from "@blossm/command-post";
import { fake, replace, restore, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";
import handlers from "../../../../event_store/handlers.js";

const now = Date.parse("2026-10-23T12:00:00.000Z");
const future = new Date(now + 60000).toISOString();
const context = {
  challenge: { root: "challenge-root" },
  session: { root: "session-root" },
};
const queued = [
  {
    domain: "account",
    action: "register",
    root: "account-root",
    payload: { principal: { root: "principal-root" } },
  },
];

// Model the store's conditional append and idempotency contract; the command
// runtime and event construction are real, while database and queue IO are seams.
const fixture = ({
  state = {},
  upgrade = true,
  failAnswer,
  failDispatch,
  failUpgrade,
} = {}) => {
  const initial = {
    code: "hashed-code",
    expires: future,
    events: queued,
    ...(upgrade && {
      upgrade: { account: { root: "account-root" } },
      claims: {},
    }),
    ...state,
  };
  let current = structuredClone(initial);
  let count = 1;
  const seen = new Set();
  const committed = [];
  const dispatched = [];
  const order = [];
  const upgradeFn = fake(async () => {
    order.push("upgrade");
    if (failUpgrade) throw failUpgrade;
    return {
      body: {
        _tokens: [{ type: "access", value: "signed-token" }],
        context: { account: { root: "account-root" } },
      },
    };
  });
  const handler = commandPost({
    mainFn: main,
    aggregateFn: () => async () => ({
      lastEventNumber: count - 1,
      state: structuredClone(current),
    }),
    commandFn: () => upgradeFn,
    queryAggregatesFn: () => fake(),
    readFactFn: () => fake(),
    streamFactFn: () => fake(),
    countFn: () => fake(),
    addFn: async ({ domain, eventData, async }) => {
      if (domain !== "challenge") {
        order.push("dispatch");
        if (failDispatch) throw failDispatch;
        dispatched.push({ eventData, async });
        return;
      }
      if (failAnswer) throw failAnswer;
      for (const { event, number } of eventData) {
        if (seen.has(event.headers.idempotency)) continue;
        if (number !== undefined && number !== count) {
          const error = new Error("Event number incorrect.");
          error.statusCode = 412;
          throw error;
        }
        count++;
        seen.add(event.headers.idempotency);
        current = handlers.answer(current, event.payload);
        committed.push({ event, number, async });
        order.push("answer");
      }
    },
  });
  const run = async () => {
    const reply = {};
    const response = {
      set() {
        return this;
      },
      status(code) {
        reply.status = code;
        return this;
      },
      send(body) {
        reply.body = body;
        return this;
      },
      sendStatus(code) {
        reply.status = code;
        return this;
      },
    };
    await handler(
      {
        body: {
          payload: { code: "123456" },
          context,
          headers: { issued: future, idempotency: "same-request-key" },
        },
      },
      response
    );
    return reply;
  };
  return { run, committed, dispatched, order, upgradeFn, state: () => current };
};

describe("Challenge consumption through the command runtime", () => {
  let clock;
  let environment;
  beforeEach(() => {
    environment = { ...process.env };
    Object.assign(process.env, {
      DOMAIN: "challenge",
      SERVICE: "some-service",
      NETWORK: "some-network",
      PROCEDURE: "command",
      NAME: "answer",
      OPERATION_HASH: "answer-operation",
    });
    clock = useFakeTimers({ now, toFake: ["Date"] });
    replace(deps, "compare", fake.resolves(true));
  });
  afterEach(() => {
    restore();
    clock.restore();
    for (const key of Object.keys(process.env))
      if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
  });

  it("commits the answer before dispatch and upgrade, retaining response metadata", async () => {
    const f = fixture();
    const reply = await f.run();
    assert.deepEqual(f.order, ["answer", "dispatch", "upgrade"]);
    assert.equal(f.committed[0].number, 1);
    assert.equal(f.committed[0].async, false);
    assert.equal(f.dispatched[0].async, true);
    assert.equal(reply.status, 202);
    assert.equal(reply.body._tokens[0].value, "signed-token");
    assert.deepEqual(reply.body.context, { account: { root: "account-root" } });
    assert.equal(reply.body._revoke[0].type, "challenge");
    assert.equal(typeof reply.body._id, "string");
    assert.equal(typeof reply.body._tx, "string");
  });

  it("allows one concurrent answer even with identical idempotency keys and timestamps", async () => {
    const f = fixture();
    const results = await Promise.allSettled([f.run(), f.run()]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    assert.equal(
      results.find((r) => r.status === "rejected").reason.statusCode,
      412
    );
    assert.equal(f.committed.length, 1);
    assert.equal(f.dispatched.length, 1);
    assert.equal(f.upgradeFn.callCount, 1);
  });

  it("rejects reuse without dispatching deferred events or upgrading again", async () => {
    const f = fixture();
    await f.run();
    const comparisons = deps.compare.callCount;
    await assert.rejects(f.run(), (e) => e.info().reason === "answered");
    assert.equal(deps.compare.callCount, comparisons);
    assert.equal(f.committed.length, 1);
    assert.equal(f.dispatched.length, 1);
    assert.equal(f.upgradeFn.callCount, 1);
  });

  for (const [name, expires] of [
    ["past", new Date(now - 1).toISOString()],
    ["exact", new Date(now).toISOString()],
    ["invalid", "not-a-date"],
    ["missing", undefined],
  ]) {
    it(`rejects ${name} expiry before persistence or side effects`, async () => {
      const f = fixture({ state: { expires } });
      await assert.rejects(f.run(), (e) => e.info().reason === "expired");
      assert.equal(f.committed.length, 0);
      assert.equal(f.dispatched.length, 0);
      assert.equal(f.upgradeFn.callCount, 0);
    });
  }

  it("does not dispatch or upgrade after answer persistence fails", async () => {
    const failure = new Error("Persistence failed.");
    const f = fixture({ failAnswer: failure });
    await assert.rejects(f.run(), (e) => e === failure);
    assert.equal(f.dispatched.length, 0);
    assert.equal(f.upgradeFn.callCount, 0);
  });

  it("keeps a challenge consumed if deferred dispatch fails", async () => {
    const failure = new Error("Queue rejected the work.");
    const f = fixture({ failDispatch: failure });
    await assert.rejects(f.run(), (e) => e === failure);
    assert(f.state().answered);
    assert.equal(f.upgradeFn.callCount, 0);
    await assert.rejects(f.run(), (e) => e.info().reason === "answered");
    assert.equal(f.committed.length, 1);
  });

  it("keeps a challenge consumed if upgrade fails after queue acceptance", async () => {
    const failure = new Error("Upgrade failed.");
    const f = fixture({ failUpgrade: failure });
    await assert.rejects(f.run(), (e) => e === failure);
    assert(f.state().answered);
    assert.equal(f.dispatched.length, 1);
    await assert.rejects(f.run(), (e) => e.info().reason === "answered");
    assert.equal(f.upgradeFn.callCount, 1);
  });

  it("consumes and dispatches without adding access tokens when no upgrade is requested", async () => {
    const f = fixture({ upgrade: false });
    const reply = await f.run();
    assert.deepEqual(f.order, ["answer", "dispatch"]);
    assert.equal(reply.status, 202);
    assert.equal(reply.body._tokens, undefined);
    assert.equal(reply.body._revoke[0].type, "challenge");
  });
});
