const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake } = require("sinon");

const deps = require("../../deps");

const root = "some-root";
const to = "some-to";
const message = "some-message";
const payload = {
  to,
  message,
};

const service = "some-service";
const network = "some-network";
const secret = "some-secret";

const sendingPhoneNumber = "some-sending-phone-number";

process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.TWILIO_SENDING_PHONE_NUMBER = sendingPhoneNumber;

const main = require("../../main");

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const smsSendFake = fake();
    const smsFake = fake.returns({
      send: smsSendFake,
    });
    replace(deps, "sms", smsFake);

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const result = await main({ payload });

    expect(result).to.deep.equal({
      events: [
        {
          action: "send",
          root,
          correctNumber: 0,
          payload: {
            to,
            message,
          },
        },
      ],
      response: {
        references: {
          sms: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(secretFake).to.have.been.calledWith("twilio-account-sid");
    expect(secretFake).to.have.been.calledWith("twilio-auth-token");
    expect(smsFake).to.have.been.calledWith(secret, secret);
    expect(smsSendFake).to.have.been.calledWith({
      to,
      from: sendingPhoneNumber,
      body: message,
    });
    await main({ payload });
    expect(smsFake).to.have.been.calledOnce;
  });
});
