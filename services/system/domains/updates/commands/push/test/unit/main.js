import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, fake, replace } from "sinon";

import deps from "../../deps.js";
import main from "../../main.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

const fanoutRealmId = "some-fanout-realm-id";

process.env.FANOUT_REALM_ID = fanoutRealmId;

const view = { a: 1 };
const channel = "some-channel";
const node = "some-node";
const type = "some-type";
const id = "some-id";
const trace = "some-trace";
const connection = "some-connection";
const key = "some-key";
const network = "some.node-network";
const context = {
  network,
  node,
  connection,
  key,
};
const name = "some-name";
const payload = {
  view,
  name,
  type,
  id,
  trace,
};
const ownNetwork = "some.own-network";
process.env.NETWORK = ownNetwork;
// Stands in for the published package, which builds the same string.
const channelNameFake = () => {
  const channelName = fake.returns(channel);
  replace(deps, "channelName", channelName);
  return channelName;
};

const secret = "some-secret";

describe("Command handler unit tests", () => {
  beforeEach(() => {
    delete process.env.GRIP_URL;
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const stream = function () {};
    const streamResult = "some-stream";
    stream.prototype.constructor = streamResult;
    const httpStreamFormatFake = fake.returns(streamResult);
    replace(deps, "grip", {
      HttpStreamFormat: httpStreamFormatFake,
    });

    const publishFake = fake();
    replace(deps, "faasGrip", {
      publish: publishFake,
    });

    const channelName = channelNameFake();
    expect(process.env.GRIP_URL).to.not.exist;
    const result = await main({ payload, context });
    // The channel is in the caller's network, whatever the payload says.
    expect(channelName).to.have.been.calledWith({ name, network });
    expect(secretFake).to.have.been.calledWith("fanout-realm-key");
    expect(process.env.GRIP_URL).to.equal(
      `https://api.fanout.io/realm/${fanoutRealmId}?iss=${fanoutRealmId}&key=base64:${secret}`
    );
    expect(httpStreamFormatFake).to.have.been.calledWith(
      // `event: update\ndata: ${JSON.stringify({
      //   view,
      //   id,
      //   trace,
      //   type,
      // })}\n\n`
      `data: ${JSON.stringify({
        view,
        id,
        trace,
        type,
      })}\n\n`
    );
    expect(publishFake).to.have.been.calledWith(channel, stream.prototype);
    expect(result).to.deep.equal();
    await main({ payload, context });
    expect(secretFake).to.have.been.calledOnce;
  });
  it("should return successfully with no context and no view", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const stream = function () {};
    const streamResult = "some-stream";
    stream.prototype.constructor = streamResult;
    const httpStreamFormatFake = fake.returns(streamResult);
    replace(deps, "grip", {
      HttpStreamFormat: httpStreamFormatFake,
    });

    const publishFake = fake();
    replace(deps, "faasGrip", {
      publish: publishFake,
    });

    const channelName = channelNameFake();
    expect(process.env.GRIP_URL).to.not.exist;
    const result = await main({
      payload: {
        name,
        type,
        id,
        trace,
      },
    });
    expect(secretFake).to.have.been.calledWith("fanout-realm-key");
    expect(process.env.GRIP_URL).to.equal(
      `https://api.fanout.io/realm/${fanoutRealmId}?iss=${fanoutRealmId}&key=base64:${secret}`
    );
    expect(httpStreamFormatFake).to.have.been.calledWith(
      // `event: update\ndata: ${JSON.stringify({
      //   id,
      //   trace,
      //   type,
      // })}\n\n`
      `data: ${JSON.stringify({
        id,
        trace,
        type,
      })}\n\n`
    );
    expect(publishFake).to.have.been.calledWith(channel, stream.prototype);
    // An internal request belongs to this network.
    expect(channelName).to.have.been.calledWith({ name, network: ownNetwork });
    expect(result).to.deep.equal();
    await main({ payload, context });
    expect(secretFake).to.have.been.calledOnce;
  });
  it("should return successfully in local env", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const stream = function () {};
    const streamResult = "some-stream";
    stream.prototype.constructor = streamResult;
    const httpStreamFormatFake = fake.returns(streamResult);
    replace(deps, "grip", {
      HttpStreamFormat: httpStreamFormatFake,
    });

    const publishFake = fake();
    replace(deps, "faasGrip", {
      publish: publishFake,
    });

    channelNameFake();
    process.env.NODE_ENV = "local";
    const result = await main({ payload, context });
    expect(process.env.GRIP_URL).to.equal(
      `http://api.fanout.io/realm/${fanoutRealmId}?iss=${fanoutRealmId}&key=base64:${secret}`
    );
    expect(httpStreamFormatFake).to.have.been.calledWith(
      // `event: update\ndata: ${JSON.stringify({
      //   view,
      //   id,
      //   trace,
      //   type,
      // })}\n\n`
      `data: ${JSON.stringify({
        view,
        id,
        trace,
        type,
      })}\n\n`
    );
    expect(publishFake).to.have.been.calledWith(channel, stream.prototype);
    expect(result).to.deep.equal();
  });
  it("should build the channel from every part and the caller's network", async () => {
    replace(deps, "secret", fake.returns(secret));
    replace(deps, "grip", { HttpStreamFormat: fake() });
    replace(deps, "faasGrip", { publish: fake() });
    const channelName = channelNameFake();
    const viewContext = {
      root: "some-context-root",
      domain: "some-domain",
      service: "some-service",
      network: "some.context-network",
    };
    const principal = {
      root: "some-principal-root",
      service: "some-service",
      network: "some.principal-network",
    };
    await main({
      payload: { ...payload, context: viewContext, principal, key: "some-key", network: "some.other-network", channel: "some-other-channel" },
      context,
    });
    expect(channelName).to.have.been.calledOnceWithExactly({
      name,
      network,
      context: viewContext,
      key: "some-key",
      principal,
    });
  });
  it("should refuse a caller without a network, and parts that aren't plain", async () => {
    const publish = fake();
    replace(deps, "secret", fake.returns(secret));
    replace(deps, "grip", { HttpStreamFormat: fake() });
    replace(deps, "faasGrip", { publish });
    channelNameFake();
    const statusCode = async (args) => {
      try {
        await main(args);
      } catch (e) {
        return e.statusCode;
      }
    };
    for (const ctx of [{ node }, { network: "a,b" }, { network: ["a.b"] }])
      expect(await statusCode({ payload, context: ctx })).to.equal(403);
    for (const bad of [
      { name: "a,b" },
      { name: "a.b" },
      { name: undefined },
      { key: "a, b" },
      { key: 3 },
      { context: { root: "a,b", domain: "d", service: "s", network: "n.n" } },
      { context: { root: "r", domain: "d", service: "s" } },
      { context: { root: "r", domain: "d.e", service: "s", network: "n.n" } },
      { principal: { root: "r", service: "s", network: "n n" } },
      { principal: { service: "s", network: "n.n" } },
    ])
      expect(
        await statusCode({ payload: { ...payload, ...bad }, context }),
        JSON.stringify(bad)
      ).to.equal(400);
    expect(publish).to.not.have.been.called;
  });
});
