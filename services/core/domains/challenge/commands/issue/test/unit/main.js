import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, replace, fake, match, useFakeTimers } from "sinon";

import deps from "../../deps.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

let clock;
const now = new Date();
const root = "some-root";
const principalRoot = "some-principal-root";
const principalService = "some-priciple-service";
const principalNetwork = "some-priciple-network";
const accountRoot = "some-account-root";
const email = "some-email";
const hmacEmail = "some-hmac-email";
const hmacSecret = "some-hmac-secret";
const password = "some-account-password";
const account = {
  root: accountRoot,
  state: {
    principal: {
      root: principalRoot,
      service: principalService,
      network: principalNetwork,
    },
    password,
  },
};

const payloadPassword = "some-payload-password";
const payload = {
  password: payloadPassword,
  email,
};
const domain = "some-domain";
const contextAccount = "some-context-account";
const context = { a: 1, account: contextAccount };
const service = "some-service";
const network = "some-network";
const token = "some-token";
const code = 123;
const hashedCode = "some-hashed-code";
const project = "some-projectl";
const region = "some-region";
const claims = {
  iss: "some-iss",
};

process.env.DOMAIN = domain;
process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_PROJECT = project;
process.env.GCP_REGION = region;

import main from "../../main.js";

// An email that has not requested a challenge before.
const noRequestsYet = {
  aggregateFn: async () => undefined,
  logEventsFn: async () => {},
  generateRootFn: () => root,
};
const requestRoot = `email-${Buffer.from(hmacEmail).toString("hex")}`;
const minutesAgo = (minutes) =>
  new Date(now.getTime() - minutes * 60 * 1000).toISOString();

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const commandFnFake = fake();

    const generateRootFnFake = fake.returns(root);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const queryAggregatesFnFake = fake.returns([account]);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const hashFake = fake.returns(hashedCode);
    replace(deps, "hash", hashFake);
    
    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const result = await main({
      ...noRequestsYet,
      payload,
      context,
      claims,
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
      generateRootFn: generateRootFnFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          correctNumber: 0,
          root,
          payload: {
            code: hashedCode,
            claims,
            issued: new Date().toISOString(),
            expires: deps.moment().add(180, "s").toDate().toISOString(),
          },
        },
      ],
      response: {
        receipt: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
      tokens: [{ network, type: "challenge", value: token }],
    });
    expect(compareFake).to.have.been.calledWith(payloadPassword, password);
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
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
          challenge: { method: "email", root, service, network },
        },
      },
      signFn: match((fn) => {
        const message = "some-message";
        const response = fn(message);
        return (
          response == signature &&
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "challenge",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
    expect(hashFake).to.have.been.calledWith(code.toString());
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });

    expect(commandFnFake).to.have.been.calledWith({
      name: "send-auth-code",
      domain: "email",
      service: "comms",
      payload: {
        from: "authenticator",
        to: email,
        subject: "Auth code",
        message: `${code} is your verification code.`,
      },
      async: true,
    });
  });
  it("should return successfully without account in context, with a principal and network in context", async () => {
    const commandFnFake = fake();

    const generateRootFnFake = fake.returns(root);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const queryAggregatesFnFake = fake.returns([account]);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const hashFake = fake.returns(hashedCode);
    replace(deps, "hash", hashFake);

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const contextNetwork = "some-context-network";
    const context = {
      principal: { root: principalRoot },
      network: contextNetwork,
    };
    const result = await main({
      ...noRequestsYet,
      payload,
      context,
      claims,
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
      generateRootFn: generateRootFnFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          correctNumber: 0,
          root,
          payload: {
            code: hashedCode,
            upgrade: {
              account: {
                root: accountRoot,
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
        receipt: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
      tokens: [{ network: contextNetwork, type: "challenge", value: token }],
    });
    expect(compareFake).to.have.been.calledWith(payloadPassword, password);
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
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
          challenge: { method: "email", root, service, network },
        },
      },
      signFn: match((fn) => {
        const message = "some-message";
        const response = fn(message);
        return (
          response == signature &&
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "challenge",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
    expect(hashFake).to.have.been.calledWith(code.toString());
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });
    
    expect(commandFnFake).to.have.been.calledWith({
      name: "send-auth-code",
      domain: "email",
      service: "comms",
      payload: {
        from: "authenticator",
        to: email,
        subject: "Auth code",
        message: `${code} is your verification code.`,
      },
      async: true,
    });
  });
  it("should return successfully without account or principal in context, with events in options", async () => {
    const commandFnFake = fake();

    const generateRootFake = fake.returns(root);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const queryAggregatesFnFake = fake.returns([account]);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const hashFake = fake.returns(hashedCode);
    replace(deps, "hash", hashFake);

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const context = {};

    const events = [{ a: 1 }, { b: 2 }];
    const result = await main({
      ...noRequestsYet,
      payload,
      context,
      claims,
      options: { events },
      commandFn: commandFnFake,
      queryAggregatesFn: queryAggregatesFnFake,
      generateRootFn: generateRootFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          correctNumber: 0,
          root,
          payload: {
            code: hashedCode,
            upgrade: {
              account: {
                root: accountRoot,
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
        receipt: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
      tokens: [{ network, type: "challenge", value: token }],
    });
    expect(compareFake).to.have.been.calledWith(payloadPassword, password);
    expect(queryAggregatesFnFake).to.have.been.calledWith({
      domain: "account",
      queryPairs: [{
        key: "emailHmac",
        value: hmacEmail,
      }],
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
          challenge: { method: "email", root, service, network },
        },
      },
      signFn: match((fn) => {
        const message = "some-message";
        const response = fn(message);
        return (
          response == signature &&
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "challenge",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
    expect(hashFake).to.have.been.calledWith(code.toString());
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email
    });

    expect(commandFnFake).to.have.been.calledWith({
      name: "send-auth-code",
      domain: "email",
      service: "comms",
      payload: {
        from: "authenticator",
        to: email,
        subject: "Auth code",
        message: `${code} is your verification code.`,
      },
      async: true,
    });
  });
  it("should return successfully if an upgrade option is passed", async () => {
    const commandFnFake = fake();

    const generateRootFake = fake.returns(root);

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const randomIntFake = fake.returns(code);
    replace(deps, "randomIntOfLength", randomIntFake);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const hashFake = fake.returns(hashedCode);
    replace(deps, "hash", hashFake);

    const secretFake = fake.returns(hmacSecret);
    replace(deps, "secret", secretFake);

    const hmacCreateFake = fake.returns(hmacEmail);
    replace(deps, "hmacCreate", hmacCreateFake);

    const upgrade = { some: "upgrade" };
    const result = await main({
      ...noRequestsYet,
      payload,
      context,
      claims,
      options: { upgrade },
      commandFn: commandFnFake,
      // A new account is being registered, so there is no password to check.
      queryAggregatesFn: fake.returns([]),
      generateRootFn: generateRootFake,
    });

    expect(compareFake).to.not.have.been.called;
    expect(result).to.deep.equal({
      events: [
        {
          action: "issue",
          correctNumber: 0,
          root,
          payload: {
            code: hashedCode,
            upgrade,
            claims,
            issued: new Date().toISOString(),
            expires: deps.moment().add(180, "s").toDate().toISOString(),
          },
        },
      ],
      response: {
        receipt: {
          challenge: {
            root,
            service,
            network,
          },
        },
      },
      tokens: [{ network, type: "challenge", value: token }],
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
          challenge: { method: "email", root, service, network },
        },
      },
      signFn: match((fn) => {
        const message = "some-message";
        const response = fn(message);
        return (
          response == signature &&
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "challenge",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
    expect(randomIntFake).to.have.been.calledWith(6);
    expect(hashFake).to.have.been.calledWith(code.toString());
    // The request is still counted against the email.
    expect(secretFake).to.have.been.calledWith("email-hmac-key");
    expect(hmacCreateFake).to.have.been.calledWith({
      secret: hmacSecret,
      message: email,
    });

    expect(Math.abs(deps.moment().add(3, "m").toDate() - new Date())).to.equal(
      180000
    );
  });
  it("should throw correctly", async () => {
    replace(deps, "secret", fake.returns(hmacSecret));
    replace(deps, "hmacCreate", fake.returns(hmacEmail));
    const errorMessage = "some-error";
    const queryAggregatesFnFake = fake.rejects(new Error(errorMessage));

    try {
      await main({
        ...noRequestsYet,
        payload,
        context,
        claims,
        queryAggregatesFn: queryAggregatesFnFake,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw correctly if no emails found", async () => {
    replace(deps, "secret", fake.returns(hmacSecret));
    replace(deps, "hmacCreate", fake.returns(hmacEmail));
    const queryAggregatesFnFake = fake.returns([]);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "invalidArgumentError", {
      message: messageFake,
    });

    try {
      await main({
        ...noRequestsYet,
        payload,
        claims,
        context,
        queryAggregatesFn: queryAggregatesFnFake,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This email isn't recognized."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if password comparing fails.", async () => {
    replace(deps, "secret", fake.returns(hmacSecret));
    replace(deps, "hmacCreate", fake.returns(hmacEmail));
    const generateRootFake = fake.returns(root);

    const queryAggregatesFnFake = fake.returns([account]);

    const compareFake = fake.returns(false);
    replace(deps, "compare", compareFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({
        ...noRequestsYet,
        payload,
        context,
        queryAggregatesFn: queryAggregatesFnFake,
        generateRootFn: generateRootFake,
      });

      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This password is incorrect."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly if context.principal doesn't match the account's principal", async () => {
    replace(deps, "secret", fake.returns(hmacSecret));
    replace(deps, "hmacCreate", fake.returns(hmacEmail));
    const generateRootFake = fake.returns(root);

    const queryAggregatesFnFake = fake.returns([account]);

    const compareFake = fake.returns(true);
    replace(deps, "compare", compareFake);

    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({
        ...noRequestsYet,
        payload,
        context: { principal: { root: "some-bogus " } },
        queryAggregatesFn: queryAggregatesFnFake,
        generateRootFn: generateRootFake,
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

  describe("request limit", () => {
    const upgrade = { some: "upgrade" };
    const run = async ({
      aggregate,
      logEventsFn = fake(),
      accounts = [],
      ip,
      aggregates,
    } = {}) => {
      const compare = fake.returns(false);
      replace(deps, "compare", compare);
      replace(deps, "secret", fake.returns(hmacSecret));
      replace(deps, "hmacCreate", fake.returns(hmacEmail));
      replace(deps, "createJwt", fake.returns(token));
      replace(deps, "randomIntOfLength", fake.returns(code));
      replace(deps, "hash", fake.returns(hashedCode));
      // `aggregates` answers by root, for requests that count on two.
      const aggregateFn = aggregates
        ? fake((requested) => aggregates[requested])
        : fake.returns(aggregate);
      const commandFn = fake();
      let error;
      try {
        await main({
          payload,
          context,
          claims,
          ...(ip && { ip }),
          options: { upgrade },
          commandFn,
          aggregateFn,
          logEventsFn,
          queryAggregatesFn: fake.returns(accounts),
          generateRootFn: fake.returns(root),
        });
      } catch (e) {
        error = e;
      }
      return { error, aggregateFn, logEventsFn, commandFn, compare };
    };
    const requestEvent = (correctNumber) => [
      {
        root: requestRoot,
        action: "request",
        correctNumber,
        payload: { requested: now.toISOString(), requestId: root },
      },
    ];

    it("counts an email's first request before sending the code", async () => {
      const { error, aggregateFn, logEventsFn, commandFn } = await run();
      expect(error).to.be.undefined;
      expect(aggregateFn).to.have.been.calledWith(requestRoot, {
        notFoundThrows: false,
      });
      expect(logEventsFn).to.have.been.calledOnceWith(requestEvent(0));
      expect(commandFn).to.have.been.calledOnce;
      expect(logEventsFn).to.have.been.calledBefore(commandFn);
    });
    it("counts a later request on the email's next event number", async () => {
      const { error, logEventsFn } = await run({
        aggregate: {
          state: { requests: [minutesAgo(1), minutesAgo(2)] },
          lastEventNumber: 6,
        },
      });
      expect(error).to.be.undefined;
      expect(logEventsFn).to.have.been.calledOnceWith(requestEvent(7));
    });
    it("refuses a sixth request within fifteen minutes and sends nothing", async () => {
      const { error, logEventsFn, commandFn } = await run({
        aggregate: {
          state: { requests: [14, 5, 4, 3, 2].map(minutesAgo) },
          lastEventNumber: 4,
        },
      });
      expect(error.statusCode).to.equal(409);
      expect(error.info()).to.deep.equal({ reason: "requests" });
      expect(logEventsFn).to.not.have.been.called;
      expect(commandFn).to.not.have.been.called;
    });
    it("doesn't count requests older than fifteen minutes", async () => {
      const { error, commandFn } = await run({
        // Dates, as the event store returns them.
        aggregate: {
          state: {
            requests: [90, 60, 16, 15, 3, 2].map(
              (minutes) => new Date(minutesAgo(minutes))
            ),
          },
          lastEventNumber: 5,
        },
      });
      expect(error).to.be.undefined;
      expect(commandFn).to.have.been.calledOnce;
    });
    it("sends nothing when the request can't be counted", async () => {
      const conflict = new Error("wrong event number");
      const { error, commandFn } = await run({
        logEventsFn: fake.rejects(conflict),
      });
      expect(error).to.equal(conflict);
      expect(commandFn).to.not.have.been.called;
    });
    describe("with the caller's address", () => {
      const ip = "203.0.113.5";
      const callerRoot = `${requestRoot}-from-${Buffer.from(ip).toString("hex")}`;
      const five = { requests: [14, 5, 4, 3, 2].map(minutesAgo) };
      it("counts on the caller and then on the email", async () => {
        const { error, logEventsFn, commandFn } = await run({ ip });
        expect(error).to.be.undefined;
        // One write for both counts, so neither is spent without the other.
        expect(logEventsFn).to.have.been.calledOnce;
        expect(
          logEventsFn.firstCall.args[0].map((event) => event.root)
        ).to.deep.equal([callerRoot, requestRoot]);
        expect(logEventsFn).to.have.been.calledBefore(commandFn);
      });
      it("refuses a caller's sixth request for an email without touching the email's count", async () => {
        const { error, logEventsFn, commandFn } = await run({
          ip,
          aggregates: { [callerRoot]: { state: five, lastEventNumber: 4 } },
        });
        expect(error.statusCode).to.equal(409);
        expect(error.info()).to.deep.equal({ reason: "requests" });
        expect(logEventsFn).to.not.have.been.called;
        expect(commandFn).to.not.have.been.called;
      });
      it("lets the owner in after another caller has used five requests", async () => {
        // The email has five recent requests, none from this address.
        const { error, commandFn } = await run({
          ip,
          aggregates: { [requestRoot]: { state: five, lastEventNumber: 4 } },
        });
        expect(error).to.be.undefined;
        expect(commandFn).to.have.been.calledOnce;
      });
      it("writes nothing for the caller when the email is refused", async () => {
        const twenty = {
          requests: Array.from({ length: 20 }, (_, i) => minutesAgo(i / 2)),
        };
        const { error, logEventsFn } = await run({
          ip,
          aggregates: { [requestRoot]: { state: twenty, lastEventNumber: 19 } },
        });
        expect(error.statusCode).to.equal(409);
        expect(logEventsFn).to.not.have.been.called;
      });
      it("allows an email its twentieth request", async () => {
        const nineteen = {
          requests: Array.from({ length: 19 }, (_, i) => minutesAgo(i / 2)),
        };
        const { error, commandFn } = await run({
          ip,
          aggregates: { [requestRoot]: { state: nineteen, lastEventNumber: 18 } },
        });
        expect(error).to.be.undefined;
        expect(commandFn).to.have.been.calledOnce;
      });
      it("counts every address of one IPv6 network as one caller", async () => {
        const rootFor = async (address) => {
          const { logEventsFn } = await run({ ip: address });
          restore();
          return logEventsFn.firstCall.args[0][0].root;
        };
        const network = await rootFor("2001:db8:0:1::1");
        for (const address of [
          "2001:0db8:0000:0001:ffff:ffff:ffff:ffff",
          "2001:DB8:0:1:a::b",
          "2001:db8::1:0:0:0:9",
        ])
          expect(await rootFor(address), address).to.equal(network);
        expect(await rootFor("2001:db8:0:2::1")).to.not.equal(network);
        // Addresses under ::/64 are not one network.
        expect(await rootFor("::ffff:102:304")).to.not.equal(
          await rootFor("::1")
        );
        // An IPv4 address is one caller on its own.
        expect(await rootFor("203.0.113.6")).to.not.equal(
          await rootFor("203.0.113.5")
        );
      });
      it("holds a caller whose address isn't one address to the email's tight limit", async () => {
        const five = {
          requests: Array.from({ length: 5 }, (_, i) => minutesAgo(i)),
        };
        // What a gateway passing on the raw forwarding header would send.
        for (const address of [
          "made-up, 203.0.113.5",
          "198.51.100.1, 203.0.113.5",
          "made-up",
          "203.0.113.5:443",
        ]) {
          const first = await run({ ip: address });
          expect(
            first.logEventsFn.firstCall.args[0].map((event) => event.root),
            address
          ).to.deep.equal([requestRoot]);
          restore();
          const sixth = await run({
            ip: address,
            aggregates: { [requestRoot]: { state: five, lastEventNumber: 4 } },
          });
          expect(sixth.error.statusCode, address).to.equal(409);
          expect(sixth.logEventsFn).to.not.have.been.called;
          restore();
        }
      });
      it("refuses an email its twenty first request, whoever asks", async () => {
        const twenty = {
          requests: Array.from({ length: 20 }, (_, i) => minutesAgo(i / 2)),
        };
        const { error, commandFn } = await run({
          ip,
          aggregates: { [requestRoot]: { state: twenty, lastEventNumber: 19 } },
        });
        expect(error.statusCode).to.equal(409);
        expect(commandFn).to.not.have.been.called;
      });
    });
    it("checks the account's password even when the upgrade is passed in", async () => {
      const { error, logEventsFn, commandFn, compare } = await run({
        accounts: [account],
      });
      expect(error.message).to.equal("This password is incorrect.");
      expect(compare).to.have.been.calledWith(payloadPassword, password);
      expect(logEventsFn).to.have.been.calledBefore(compare);
      expect(commandFn).to.not.have.been.called;
    });
    it("counts the request before the password is checked", async () => {
      replace(deps, "secret", fake.returns(hmacSecret));
      replace(deps, "hmacCreate", fake.returns(hmacEmail));
      const compareFake = fake.returns(false);
      replace(deps, "compare", compareFake);
      const logEventsFn = fake();
      try {
        await main({
          payload,
          context,
          aggregateFn: fake.returns(undefined),
          logEventsFn,
          queryAggregatesFn: fake.returns([account]),
          generateRootFn: fake.returns(root),
        });
        expect.fail("should have thrown");
      } catch (e) {
        expect(e.message).to.equal("This password is incorrect.");
      }
      expect(logEventsFn).to.have.been.calledBefore(compareFake);
    });
  });
});
