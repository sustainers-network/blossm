const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

const principleRoot = "some-principle-root";
const principleService = "some-principle-service";
const principleNetwork = "some-principle-network";

const payload = {
  principle: {
    root: principleRoot,
    service: principleService,
    network: principleNetwork,
  },
};

const token = "some-token";
const project = "some-projectl";
const root = "some-root";
const contextSessionService = "some-context-session-service";
const contextSessionNetwork = "some-context-session-network";
const context = {
  session: {
    root,
    service: contextSessionService,
    network: contextSessionNetwork,
  },
};
const service = "some-service";
const network = "some-network";

const iss = "some-iss";
const aud = "some-aud";
const sub = "some-sub";
const exp = deps.stringFromDate(new Date(deps.fineTimestamp() + 300));
const claims = {
  iss,
  aud,
  sub,
  exp,
};

process.env.GCP_PROJECT = project;
process.env.SERVICE = service;
process.env.NETWORK = network;

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully with sub in claims and principle in payload", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = fake.returns({
      aggregate: { upgraded: false },
    });

    const result = await main({
      payload,
      context,
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "upgrade",
          payload: {
            principle: {
              root: principleRoot,
              service: principleService,
              network: principleNetwork,
            },
          },
          root,
        },
        {
          root: principleRoot,
          domain: "principle",
          action: "add-roles",
          payload: {
            roles: [
              {
                id: "SessionAdmin",
                root,
                service: contextSessionService,
                network: contextSessionNetwork,
              },
            ],
          },
        },
      ],
      response: {
        tokens: [{ network, type: "access", value: token }],
        context: {
          ...context,
          principle: {
            root: principleRoot,
            service: principleService,
            network: principleNetwork,
          },
        },
      },
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "access",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: sub,
        audience: aud,
        expiresIn: Date.parse(exp) - deps.fineTimestamp(),
      },
      payload: {
        context: {
          ...context,
          principle: {
            root: principleRoot,
            service: principleService,
            network: principleNetwork,
          },
        },
      },
      signFn: signature,
    });
  });
  it("should return successfully with sub in claims, no principle in payload", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = fake.returns({
      aggregate: { upgraded: false },
    });

    const result = await main({
      payload: { a: 1 },
      context,
      claims,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "upgrade",
          payload: {
            a: 1,
          },
          root,
        },
      ],
      response: {
        tokens: [{ network, type: "access", value: token }],
        context: {
          ...context,
          a: 1,
        },
      },
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "access",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: sub,
        audience: aud,
        expiresIn: Date.parse(exp) - deps.fineTimestamp(),
      },
      payload: {
        context: {
          ...context,
          a: 1,
        },
      },
      signFn: signature,
    });
  });
  it("should return successfully with no sub in claims", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = fake.returns({
      aggregate: { upgraded: false },
    });

    const result = await main({
      payload,
      context,
      claims: {
        iss,
        aud,
        exp,
      },
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "upgrade",
          payload: {
            principle: {
              root: principleRoot,
              service: principleService,
              network: principleNetwork,
            },
          },
          root,
        },
        {
          root: principleRoot,
          domain: "principle",
          action: "add-roles",
          payload: {
            roles: [
              {
                id: "SessionAdmin",
                root,
                service: contextSessionService,
                network: contextSessionNetwork,
              },
            ],
          },
        },
      ],
      response: {
        tokens: [{ network, type: "access", value: token }],
        context: {
          ...context,
          principle: {
            root: principleRoot,
            service: principleService,
            network: principleNetwork,
          },
        },
      },
    });
    expect(aggregateFake).to.have.been.calledWith(root);
    expect(signFake).to.have.been.calledWith({
      ring: "jwt",
      key: "access",
      location: "global",
      version: "1",
      project,
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: principleRoot,
        audience: aud,
        expiresIn: Date.parse(exp) - deps.fineTimestamp(),
      },
      payload: {
        context: {
          ...context,
          principle: {
            root: principleRoot,
            service: principleService,
            network: principleNetwork,
          },
        },
      },
      signFn: signature,
    });
  });
  it("should return empty if payload is empty", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = fake.returns({
      aggregate: { terminated: deps.stringDate() },
    });

    const response = await main({
      payload: {},
      context,
      aggregateFn: aggregateFake,
    });
    expect(response).to.deep.equal({});
  });
  it("should throw correctly if session terminated", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = fake.returns({
      aggregate: { terminated: deps.stringDate() },
    });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });

    try {
      await main({
        payload,
        context,
        aggregateFn: aggregateFake,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This session is terminated."
      );
      expect(e).to.equal(error);
    }
  });

  it("should throw correctly", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const errorMessage = "some-error";
    const createJwtFake = fake.rejects(errorMessage);
    replace(deps, "createJwt", createJwtFake);

    const aggregateFake = fake.returns({
      aggregate: { upgraded: false },
    });

    try {
      await main({
        payload,
        context,
        claims,
        aggregateFn: aggregateFake,
      });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
