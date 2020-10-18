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
  beforeEach(() => {
    process.env.NODE_ENV = "not-local";
  });
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const secretFake = fake.returns(secret);
    replace(deps, "secret", secretFake);

    const info = "some-info";
    const sendMailFake = fake.returns(info);
    const createTransportFake = fake.returns({
      sendMail: sendMailFake,
    });
    replace(deps, "nodemailer", {
      createTransport: createTransportFake,
      getTestMessageUrl: fake(),
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
        info,
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
  it("should return successfully in local env", async () => {
    const info = "some-info";
    const sendMailFake = fake.returns(info);
    const createTransportFake = fake.returns({
      sendMail: sendMailFake,
    });
    const user = "some-user";
    const pass = "some-pass";
    const host = "some-host";
    const port = "some-port";
    const secure = "some-secure";
    const createTestAccountFake = fake.returns({
      smtp: {
        host,
        port,
        secure,
      },
      user,
      pass,
    });
    replace(deps, "nodemailer", {
      createTransport: createTransportFake,
      createTestAccount: createTestAccountFake,
      getTestMessageUrl: fake(),
    });

    const generateRootFake = fake.returns(root);

    process.env.NODE_ENV = "local";
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
        info,
        receipt: {
          email: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(createTransportFake).to.have.been.calledWith({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
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
