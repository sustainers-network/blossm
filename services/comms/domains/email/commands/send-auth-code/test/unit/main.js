import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const root = "some-root";
const from = "some-from";
const to = "some-to";
const encryptedTo = "some-encrypted-to";
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
const secret = "some-secret";
const project = "some-project";

process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_PROJECT = project;

const contextNetwork = "some-context-network";
const context = {
  network: contextNetwork,
};

describe("Command handler unit tests", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "not-local";
  });
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const secretFake = fake.resolves(secret);
    replace(deps, "secret", secretFake);

    const info = "some-info";
    const sendMailFake = fake.resolves(info);
    const verifyFake = fake.resolves(true);
    const createTransportFake = fake.returns({
      verify: verifyFake,
      sendMail: sendMailFake,
    });
    replace(deps, "nodemailer", {
      createTransport: createTransportFake,
    });

    const generateRootFake = fake.returns(root);

    const encryptFake = fake.resolves(encryptedTo);
    replace(deps, "encrypt", encryptFake);

    const result = await main({
      payload,
      context,
      generateRootFn: generateRootFake,
    });

    // The stored event has the sender and the encrypted recipient only.
    expect(result).to.deep.equal({
      events: [
        {
          action: "send-auth-code",
          root,
          payload: {
            from,
            to: encryptedTo,
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
    expect(secretFake).to.have.been.calledWith(
      "railgun-authenticator-password"
    );
    expect(createTransportFake).to.have.been.calledWith({
      host: "smtp.mailgun.org",
      port: 465,
      secure: true,
      auth: {
        user: "authenticator@dianet.work",
        pass: secret,
      },
    });
    expect(verifyFake).to.have.been.calledOnce;
    expect(sendMailFake).to.have.been.calledWith({
      from: `"${contextNetwork}" <${from}@${contextNetwork}>`,
      to,
      subject,
      text: message,
    });

    expect(encryptFake).to.have.been.calledWith({
      message: to,
      key: "address",
      ring: "email",
      location: "global",
      project: project,
      format: "base64",
    });
  });
  it("should return successfully in local env", async () => {
    const info = "some-info";
    const sendMailFake = fake.resolves(info);
    const createTransportFake = fake.returns({
      verify: fake.resolves(true),
      sendMail: sendMailFake,
    });
    const user = "some-user";
    const pass = "some-pass";
    const host = "some-host";
    const port = "some-port";
    const secure = "some-secure";
    const createTestAccountFake = fake.resolves({
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
    });

    const generateRootFake = fake.returns(root);

    const encryptFake = fake.resolves(encryptedTo);
    replace(deps, "encrypt", encryptFake);

    process.env.NODE_ENV = "local";
    const result = await main({
      payload,
      context,
      generateRootFn: generateRootFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "send-auth-code",
          root,
          payload: {
            from,
            to: encryptedTo,
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
    expect(encryptFake).to.have.been.calledWith({
      message: to,
      key: "address",
      ring: "email",
      location: "global",
      project: project,
      format: "base64",
    });
  });
  it("should fail before sending if the transport can't be verified", async () => {
    replace(deps, "secret", fake.resolves(secret));

    const sendMailFake = fake.resolves("some-info");
    replace(deps, "nodemailer", {
      createTransport: fake.returns({
        verify: fake.rejects(new Error("some-error")),
        sendMail: sendMailFake,
      }),
    });
    replace(deps, "encrypt", fake.resolves(encryptedTo));

    let error;
    try {
      await main({ payload, context, generateRootFn: fake.returns(root) });
    } catch (e) {
      error = e;
    }
    expect(error.message).to.equal("Email configuration error: some-error");
    expect(sendMailFake).to.not.have.been.called;
  });
});
