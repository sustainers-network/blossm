const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const deps = require("../../deps");
let main;

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
const context = {
  node,
  connection,
  key,
};
const payload = {
  view,
  channel,
  type,
  id,
  trace,
};

const secret = "some-secret";

describe("Command handler unit tests", () => {
  beforeEach(() => {
    delete require.cache[require.resolve("../../main.js")];
    main = require("../../main.js");
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

    expect(process.env.GRIP_URL).to.not.exist;
    const result = await main({ payload, context });
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

    expect(process.env.GRIP_URL).to.not.exist;
    const result = await main({
      payload: {
        channel,
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
});
