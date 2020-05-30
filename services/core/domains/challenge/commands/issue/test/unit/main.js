const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, useFakeTimers } = require("sinon");

const deps = require("../../deps");

let clock;
const now = new Date();
const root = "some-root";
const principalRoot = "some-identity-principal";
const principalService = "some-priciple-service";
const principalNetwork = "some-priciple-network";
const identityRoot = "some-identity-root";
const phone = "some-identity-phone";
const identity = {
  headers: {
    root: identityRoot,
  },
  state: {
    principal: {
      root: principalRoot,
      service: principalService,
      network: principalNetwork,
    },
    phone,
  },
};

const payloadPhone = "some-payload-phone";
const id = "some-id";
const payload = {
  phone: payloadPhone,
  id,
};
const domain = "some-domain";
const contextIdentity = "some-context-identity";
const context = { a: 1, identity: contextIdentity };
const service = "some-service";
const network = "some-network";
const token = "some-token";
const code = "some-code";
const project = "some-projectl";
const claims = {
  iss: "some-iss",
};

process.env.DOMAIN = domain;
process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_PROJECT = project;

const main = require("../../main");

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const issueFake = fake();
    const commandSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: commandSetFake,
    });
    replace(deps, "command", commandFake);

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const queryFake = fake.returns({ body: [identity] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const result = await main({ payload, context, claims });

    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          root,
          correctNumber: 0,
          payload: {
            code,
            claims,
            issued: new Date().toISOString(),
            expires: deps.moment().add(180, "s").toDate().toISOString(),
          },
        },
      ],
      response: {
        tokens: [{ network, type: "challenge", value: token }],
        references: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(compareFake).to.have.been.calledWith(payloadPhone, phone);
    expect(queryFake).to.have.been.calledWith({
      key: "id",
      value: id,
    });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(eventStoreFake).to.have.been.calledWith({
      domain: "identity",
    });
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "challenge",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/issue`,
        audience: network,
        expiresIn: 3600000,
      },
      payload: {
        context: {
          ...context,
          challenge: { root, service, network },
        },
      },
      signFn: signature,
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
    expect(commandFake).to.have.been.calledWith({
      name: "send",
      domain: "sms",
      service: "comms",
    });
    expect(commandSetFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith({
      to: payloadPhone,
      message: `${code} is your verification code. Enter it in the app to let us know it's really you.`,
    });
  });
  it("should return successfully without identity in context, but with a principal in context", async () => {
    const issueFake = fake();
    const commandSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: commandSetFake,
    });
    replace(deps, "command", commandFake);

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const queryFake = fake.returns({ body: [identity] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const context = { principal: { root: principalRoot } };
    const result = await main({
      payload,
      context,
      claims,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          root,
          correctNumber: 0,
          payload: {
            code,
            upgrade: {
              identity: {
                root: identityRoot,
                service,
                network,
              },
            },
            claims,
            issued: new Date().toISOString(),
            expires: deps.moment().add(180, "s").toDate().toISOString(),
          },
        },
      ],
      response: {
        tokens: [{ network, type: "challenge", value: token }],
        references: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(compareFake).to.have.been.calledWith(payloadPhone, phone);
    expect(queryFake).to.have.been.calledWith({
      key: "id",
      value: id,
    });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(eventStoreFake).to.have.been.calledWith({
      domain: "identity",
    });
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "challenge",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/issue`,
        audience: network,
        expiresIn: 3600000,
      },
      payload: {
        context: {
          ...context,
          challenge: { root, service, network },
        },
      },
      signFn: signature,
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
    expect(commandFake).to.have.been.calledWith({
      name: "send",
      domain: "sms",
      service: "comms",
    });
    expect(commandSetFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith({
      to: payloadPhone,
      message: `${code} is your verification code. Enter it in the app to let us know it's really you.`,
    });
  });
  it("should return successfully without identity or principal in context, with events in options", async () => {
    const issueFake = fake();
    const commandSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: commandSetFake,
    });
    replace(deps, "command", commandFake);

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const queryFake = fake.returns({ body: [identity] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const context = {};

    const events = [{ a: 1 }, { b: 2 }];
    const result = await main({
      payload,
      context,
      claims,
      options: { events },
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          root,
          correctNumber: 0,
          payload: {
            code,
            upgrade: {
              identity: {
                root: identityRoot,
                service,
                network,
              },
              principal: {
                root: principalRoot,
                service: principalService,
                network: principalNetwork,
              },
            },
            claims,
            issued: new Date().toISOString(),
            expires: deps.moment().add(180, "s").toDate().toISOString(),
            events,
          },
        },
      ],
      response: {
        tokens: [{ network, type: "challenge", value: token }],
        references: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(compareFake).to.have.been.calledWith(payloadPhone, phone);
    expect(queryFake).to.have.been.calledWith({
      key: "id",
      value: id,
    });
    expect(setFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(eventStoreFake).to.have.been.calledWith({
      domain: "identity",
    });
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "challenge",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/issue`,
        audience: network,
        expiresIn: 3600000,
      },
      payload: {
        context: {
          ...context,
          challenge: { root, service, network },
        },
      },
      signFn: signature,
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
    expect(commandFake).to.have.been.calledWith({
      name: "send",
      domain: "sms",
      service: "comms",
    });
    expect(commandSetFake).to.have.been.calledWith({
      context,
      tokenFns: { internal: deps.gcpToken },
    });
    expect(issueFake).to.have.been.calledWith({
      to: payloadPhone,
      message: `${code} is your verification code. Enter it in the app to let us know it's really you.`,
    });
  });
  it("should return successfully if an upgrade option is passed", async () => {
    const issueFake = fake();
    const commandSetFake = fake.returns({
      issue: issueFake,
    });
    const commandFake = fake.returns({
      set: commandSetFake,
    });
    replace(deps, "command", commandFake);

    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const upgrade = { some: "upgrade" };
    const result = await main({
      payload,
      context,
      claims,
      options: { upgrade },
    });

    expect(compareFake).to.not.have.been.called;
    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          root,
          correctNumber: 0,
          payload: {
            code,
            upgrade,
            claims,
            issued: new Date().toISOString(),
            expires: deps.moment().add(180, "s").toDate().toISOString(),
          },
        },
      ],
      response: {
        tokens: [{ network, type: "challenge", value: token }],
        references: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
    });
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "challenge",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/issue`,
        audience: network,
        expiresIn: 3600000,
      },
      payload: {
        context: {
          ...context,
          challenge: { root, service, network },
        },
      },
      signFn: signature,
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const queryFake = fake.rejects(new Error(errorMessage));
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    try {
      await main({ payload, context, claims });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw correctly if no phones found", async () => {
    const queryFake = fake.returns({ body: [] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "invalidArgumentError", {
      message: messageFake,
    });

    try {
      await main({
        payload,
        claims,
        context,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith("This id isn't recognized.");
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if phone number comparing fails.", async () => {
    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const queryFake = fake.returns({ body: [identity] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const compareFake = fake.returns(false);
    replace(deps, "compare", compareFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({
        payload,
        context,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This phone number can't be used to challenge."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if context.principal doesn't match the identity's principal", async () => {
    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const queryFake = fake.returns({ body: [identity] });
    const setFake = fake.returns({
      query: queryFake,
    });
    const eventStoreFake = fake.returns({
      set: setFake,
    });
    replace(deps, "eventStore", eventStoreFake);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({
        payload,
        context: { principal: { root: "some-bogus " } },
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This principal can't be challenged during the current session."
      );
      expect(e).to.equal(error);
    }
  });
});
