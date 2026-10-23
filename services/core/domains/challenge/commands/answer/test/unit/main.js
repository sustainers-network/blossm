import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, replace, fake, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

let clock;
const now = new Date();
const challengeUpgrade = "some-challenge-upgrade";
const code = "some-code";
const hashedCode = "some-hashed-code";
const exp = "some-exp";
const iss = "some-iss";
const aud = "some-aud";
const answerId = "some-answer-id";
const challenge = {
  code: hashedCode,
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
const _tokens = [{ type: "access", value: "some-token" }];
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
      lastEventNumber: 0,
      state: {
        ...challenge,
        upgrade: challengeUpgrade,
        expires: deps.moment().add(1, "m").toDate().toISOString(),
      },
    });

    const commandFnFake = fake.returns({
      body: { _tokens, context: newContext },
    });

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const { thenFn, ...result } = await main({
      payload,
      context,
      aggregateFn: aggregateFake,
      commandFn: commandFnFake,
      generateRootFn: fake.returns(answerId),
    });

    expect(commandFnFake).not.to.have.been.called;
    await thenFn();

    expect(result).to.deep.equal({
      events: [
        {
          action: "answer",
          correctNumber: 1,
          payload: {
            answered: deps.stringDate(),
            answerId,
          },
          root: contextChallenge,
        },
      ],
      response: { context: newContext },
      tokens: _tokens,
      revoke: [
        {
          type: "challenge",
          network,
        },
      ],
    });
    expect(aggregateFake).to.have.been.calledWith(contextChallenge);
    expect(compareFake).to.have.been.calledWith(code, hashedCode);
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
      lastEventNumber: 0,
      state: {
        ...challenge,
        expires: deps.moment().add(1, "m").toDate().toISOString(),
      },
    });

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const { thenFn, ...result } = await main({
      payload,
      context,
      aggregateFn: aggregateFake,
      generateRootFn: fake.returns(answerId),
    });

    await thenFn();

    expect(result).to.deep.equal({
      events: [
        {
          action: "answer",
          correctNumber: 1,
          payload: {
            answered: deps.stringDate(),
            answerId,
          },
          root: contextChallenge,
        },
      ],
      revoke: [
        {
          type: "challenge",
          network,
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
      lastEventNumber: 0,
      state: {
        ...challenge,
        code: "bogus",
        expires: deps.moment().add(1, "m").toDate().toISOString(),
      },
    });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "invalidArgumentError", {
      message: messageFake,
    });
    
    const compareFake = fake.returns(false);
    replace(deps, "compare", compareFake);

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
      lastEventNumber: 0,
      state: {
        ...challenge,
        expires: deps.moment().subtract(1, "s").toDate().toISOString(),
      },
    });

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "invalidArgumentError", {
      message: messageFake,
    });

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

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
