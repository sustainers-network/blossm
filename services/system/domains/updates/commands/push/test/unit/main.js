const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const deps = require("../../deps");
let main;

const fanoutRealmId = "some-fanout-realm-id";

process.env.FANOUT_REALM_ID = fanoutRealmId;

const root = "some-root";
const view = { a: 1 };
const channel = "some-channel";
const node = "some-node";
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

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);
    expect(process.env.GRIP_URL).to.not.exist;
    const result = await main({ payload, context });
    expect(secretFake).to.have.been.calledWith("fanout-realm-key");
    expect(process.env.GRIP_URL).to.equal(
      `https://api.fanout.io/realm/${fanoutRealmId}?iss=${fanoutRealmId}&key=base64:${secret}`
    );
    expect(httpStreamFormatFake).to.have.been.calledWith(
      `event: update\ndata: ${JSON.stringify(view)}\n\n`
    );
    expect(publishFake).to.have.been.calledWith(channel, stream.prototype);
    expect(result).to.deep.equal();
    await main({ payload, context });
    expect(secretFake).to.have.been.calledOnce;
  });
  it("should return successfully with no context", async () => {
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

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);
    expect(process.env.GRIP_URL).to.not.exist;
    const result = await main({ payload });
    expect(secretFake).to.have.been.calledWith("fanout-realm-key");
    expect(process.env.GRIP_URL).to.equal(
      `https://api.fanout.io/realm/${fanoutRealmId}?iss=${fanoutRealmId}&key=base64:${secret}`
    );
    expect(httpStreamFormatFake).to.have.been.calledWith(
      `event: update\ndata: ${JSON.stringify(view)}\n\n`
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

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);
    process.env.NODE_ENV = "local";
    const result = await main({ payload, context });
    expect(process.env.GRIP_URL).to.equal(
      `http://api.fanout.io/realm/${fanoutRealmId}?iss=${fanoutRealmId}&key=base64:${secret}`
    );
    expect(httpStreamFormatFake).to.have.been.calledWith(
      `event: update\ndata: ${JSON.stringify(view)}\n\n`
    );
    expect(publishFake).to.have.been.calledWith(channel, stream.prototype);
    expect(result).to.deep.equal();
  });
});
