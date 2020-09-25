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
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const stream = function () {};
    const publishHttpStreamFake = fake();
    const streamResult = {
      publishHttpStream: publishHttpStreamFake,
    };
    stream.prototype.constructor = streamResult;
    const gripPubControlFake = fake.returns(streamResult);
    replace(deps, "grip", {
      GripPubControl: gripPubControlFake,
    });

    expect(process.env.GRIP_URL).to.not.exist;
    await main({ payload, context });
    expect(secretFake).to.have.been.calledWith("fanout-realm-key");
    expect(gripPubControlFake).to.have.been.calledWith({
      control_uri: `https://api.fanout.io/realm/${fanoutRealmId}`,
      control_iss: fanoutRealmId,
      key: Buffer.from(secret, "base64"),
    });
    expect(publishHttpStreamFake).to.have.been.calledWith(channel, {
      view,
      id,
      trace,
      type,
    });
  });
  it("should return successfully with optionals omitted", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const stream = function () {};
    const publishHttpStreamFake = fake();
    const streamResult = {
      publishHttpStream: publishHttpStreamFake,
    };
    stream.prototype.constructor = streamResult;
    const gripPubControlFake = fake.returns(streamResult);
    replace(deps, "grip", {
      GripPubControl: gripPubControlFake,
    });

    expect(process.env.GRIP_URL).to.not.exist;
    await main({
      payload: {
        channel,
        type,
        id,
        trace,
      },
      context,
    });
    expect(secretFake).to.have.been.calledWith("fanout-realm-key");
    expect(gripPubControlFake).to.have.been.calledWith({
      control_uri: `https://api.fanout.io/realm/${fanoutRealmId}`,
      control_iss: fanoutRealmId,
      key: Buffer.from(secret, "base64"),
    });
    expect(publishHttpStreamFake).to.have.been.calledWith(channel, {
      id,
      trace,
      type,
    });
  });
});
