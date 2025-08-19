const { expect } = require("chai");
const { fake, replace } = require("sinon");

const deps = require("../../../deps.js");
const main = require("../../main.js");

describe("Command handler unit tests", () => {
  let hashFake;
  let badRequestErrorFake;
  let forbiddenErrorFake;

  beforeEach(() => {
    hashFake = fake.returns("hashed-password");
    badRequestErrorFake = {
      message: fake.returns("Account already has a password set."),
    };
    forbiddenErrorFake = {
      message: fake.returns("Can only modify your own account."),
    };

    replace(deps, "hash", hashFake);
    replace(deps, "badRequestError", badRequestErrorFake);
    replace(deps, "forbiddenError", forbiddenErrorFake);
  });

  it("should throw error if account already has a password", async () => {
    const aggregateFnFake = fake.returns({
      state: {
        password: "existing-password",
      },
    });

    const payload = { password: "new-password" };
    const context = {
      account: {
        root: "some-account-root",
        service: "some-service",
        network: "some.network",
      },
    };

    try {
      await main({
        payload,
        context,
        aggregateFn: aggregateFnFake,
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.equal("Account already has a password set.");
      expect(aggregateFnFake).to.have.been.calledWith("some-account-root");
      expect(badRequestErrorFake.message).to.have.been.calledWith(
        "Account already has a password set.",
        {
          info: { reason: "password_already_set" },
        }
      );
    }
  });

  it("should throw error if trying to modify different account", async () => {
    const aggregateFnFake = fake.returns({
      root: "different-account-root",
      state: {
        email: "some@email.com",
        principal: {
          root: "some-principal",
          service: "some-service",
          network: "some.network",
        },
      },
    });

    const payload = { password: "new-password" };
    const context = {
      account: {
        root: "some-account-root",
        service: "some-service",
        network: "some.network",
      },
    };

    try {
      await main({
        payload,
        context,
        aggregateFn: aggregateFnFake,
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).to.equal("Can only modify your own account.");
      expect(aggregateFnFake).to.have.been.calledWith("some-account-root");
      expect(forbiddenErrorFake.message).to.have.been.calledWith(
        "Can only modify your own account.",
        {
          info: { reason: "unauthorized_account_modification" },
        }
      );
    }
  });

  it("should successfully set password if account doesn't have one", async () => {
    const aggregateFnFake = fake.returns({
      root: "some-account-root",
      state: {
        email: "some@email.com",
        principal: {
          root: "some-principal",
          service: "some-service",
          network: "some.network",
        },
      },
    });

    const payload = { password: "new-password" };
    const context = {
      account: {
        root: "some-account-root",
        service: "some-service",
        network: "some.network",
      },
    };

    const result = await main({
      payload,
      context,
      aggregateFn: aggregateFnFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          action: "set-password",
          root: "some-account-root",
          payload: {
            password: "hashed-password",
          },
        },
      ],
      response: {
        receipt: {
          account: {
            root: "some-account-root",
            service: "some-service",
            network: "some.network",
          },
        },
      },
    });

    expect(aggregateFnFake).to.have.been.calledWith("some-account-root");
    expect(hashFake).to.have.been.calledWith("new-password");
  });
}); 