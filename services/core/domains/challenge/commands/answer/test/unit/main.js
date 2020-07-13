const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();
const challengeUpgrade = "some-challenge-upgrade";
const code = "some-code";
const exp = "some-exp";
const iss = "some-iss";
const aud = "some-aud";
const challenge = {
  code,
  claims: {
    exp,
    iss,
    aud,
  },
};
const payload = {
  code,
};
const contextChallenge = "some-challenge-context";
const sessionRoot = "some-session-root";
const context = {
  challenge: {
    root: contextChallenge,
  },
  session: { root: sessionRoot },
};
const newContext = "some-new-context";
const service = "some-service";
const network = "some-network";
const tokens = "some-tokens";
const project = "some-projectl";

process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_PROJECT = project;

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const aggregateFake = fake.returns({
      aggregate: {
        ...challenge,
        upgrade: challengeUpgrade,
        expires: deps.stringDate(),
      },
    });

    const commandFnFake = fake.returns({
      body: { tokens, context: newContext },
    });

    const result = await main({
      payload,
      context,
      aggregateFn: aggregateFake,
      commandFn: commandFnFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "answer",
          payload: {
            answered: deps.stringDate(),
          },
          root: contextChallenge,
        },
      ],
      response: { tokens, context: newContext },
    });
    expect(aggregateFake).to.have.been.calledWith(contextChallenge);
    expect(commandFnFake).to.have.been.calledWith({
      domain: "session",
      name: "upgrade",
      claims: {
        iss,
        exp,
        aud,
      },
      payload: challengeUpgrade,
    });
  });
  it("should return successfully if upgrade is not provided.", async () => {
    const aggregateFake = fake.returns({
      aggregate: {
        ...challenge,
        expires: deps.stringDate(),
      },
    });

    const result = await main({
      payload,
      context,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "answer",
          payload: {
            answered: deps.stringDate(),
          },
          root: contextChallenge,
        },
      ],
    });
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const aggregateFake = fake.rejects(errorMessage);
    try {
      await main({ payload, context, aggregateFn: aggregateFake });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw correctly if a challenge is with the wrong code", async () => {
    const aggregateFake = fake.returns({
      aggregate: {
        ...challenge,
        code: "bogus",
        expires: deps.stringDate(),
      },
    });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "invalidArgumentError", {
      message: messageFake,
    });

    try {
      await main({ payload, context, aggregateFn: aggregateFake });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith("This code is wrong.", {
        info: { reason: "wrong" },
      });
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if a challenge is expired", async () => {
    const aggregateFake = fake.returns({
      aggregate: {
        ...challenge,
        expires: deps.moment().subtract(1, "s").toDate().toISOString(),
      },
    });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "invalidArgumentError", {
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
      expect(messageFake).to.have.been.calledWith("This code expired.", {
        info: { reason: "expired" },
      });
      expect(e).to.equal(error);
    }
  });
});
