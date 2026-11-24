import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, replace, fake } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const service = "some-service";
const network = "some.network";
const accountRoot = "some-account-root";
const payload = { password: "new-password" };
const context = { account: { root: accountRoot, service, network } };

process.env.SERVICE = service;
process.env.NETWORK = network;

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });

  it("should throw a bad request error if the account already has a password", async () => {
    const hashFake = fake.resolves("hashed-password");
    replace(deps, "hash", hashFake);
    const aggregateFnFake = fake.resolves({
      state: { password: "existing-password" },
    });

    // The real error dependency is used so a wrong export name fails here.
    let error;
    try {
      await main({ payload, context, aggregateFn: aggregateFnFake });
    } catch (e) {
      error = e;
    }

    expect(error.statusCode).to.equal(400);
    expect(error.message).to.equal("Account already has a password set.");
    expect(error.toJSON().info).to.deep.equal({ reason: "password_already_set" });
    expect(aggregateFnFake).to.have.been.calledWith(accountRoot);
    expect(hashFake).to.not.have.been.called;
  });

  it("should set the password if the account doesn't have one", async () => {
    const hashFake = fake.resolves("hashed-password");
    replace(deps, "hash", hashFake);
    const aggregateFnFake = fake.resolves({
      root: accountRoot,
      state: {
        principal: { root: "some-principal", service, network },
      },
    });

    const result = await main({ payload, context, aggregateFn: aggregateFnFake });

    expect(result).to.deep.equal({
      events: [
        {
          action: "set-password",
          root: accountRoot,
          payload: { password: "hashed-password" },
        },
      ],
      response: {
        receipt: { account: { root: accountRoot, service, network } },
      },
    });
    expect(aggregateFnFake).to.have.been.calledWith(accountRoot);
    expect(hashFake).to.have.been.calledWith("new-password");
  });
});
