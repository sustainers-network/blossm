const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake } = require("sinon");

const deps = require("../../deps");

const root = "some-root";
const from = "some-from";
const to = "some-to";
const subject = "some-subject";
const message = "some-message";
const payload = {
  from,
  to,
  subject,
  message,
};

const service = "some-service";
const network = "some-network";
const secret = "some-secret\\n";

const gmailUser = "some-gmail-user";
const gmailClientId = "some-gmail-client-id";

process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GMAIL_USER = gmailUser;
process.env.GMAIL_CLIENT_ID = gmailClientId;

const contextNetwork = "some-context-network";
const context = {
  network: contextNetwork,
};

const main = require("../../main");

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const sendMailFake = fake();
    const createTransportFake = fake.returns({
      sendMail: sendMailFake,
    });
    replace(deps, "nodemailer", {
      createTransport: createTransportFake,
    });

    const generateRootFake = fake.returns(root);

    const result = await main({
      payload,
      context,
      generateRootFn: generateRootFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "send",
          root,
          payload: {
            from,
            to,
            subject,
            message,
          },
        },
      ],
      response: {
        receipt: {
          email: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(secretFake).to.have.been.calledWith("gmail-private-key");
    expect(createTransportFake).to.have.been.calledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: gmailUser,
        serviceClient: gmailClientId,
        privateKey: `some-secret\n`,
      },
    });
    expect(sendMailFake).to.have.been.calledWith({
      from: `"${contextNetwork}" <${from}@${contextNetwork}>`,
      to,
      subject,
      text: message,
    });
  });
});
