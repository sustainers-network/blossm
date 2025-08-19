import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, fake, replace, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

let clock;
const now = new Date();
const root = "some-root";
const context = { session: { root } };

const network = "some-network";
process.env.NETWORK = network;
describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
    restore();
  });
  it("should return successfully", async () => {
    const aggregateFake = fake.returns({ state: {} });
    const result = await main({
      context,
      aggregateFn: aggregateFake,
    });

    expect(result).to.deep.equal({
      events: [
        {
          root,
          action: "terminate",
          payload: {
            terminated: deps.stringDate(),
          },
        },
      ],
      revoke: [{ type: "access", network }],
    });
  });
  it("should throw correctly if aggregate has already been terminated", async () => {
    const aggregateFake = fake.returns({
      state: { terminated: deps.stringDate() },
    });
    const error = "some-error";
    const messageFake = fake.returns(error);
    replace(deps, "badRequestError", {
      message: messageFake,
    });
    try {
      await main({ context, aggregateFn: aggregateFake });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "This session has already been terminated."
      );
      expect(e).to.equal(error);
    }
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const aggregateFake = fake.rejects(errorMessage);
    try {
      await main({ context, aggregateFn: aggregateFake });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
