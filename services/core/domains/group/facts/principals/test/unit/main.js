import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const caller = { root: "some-caller", service: "some-service", network: "some.network" };
const context = { principal: caller };

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const root = "some-root";
    const principals = [caller];
    const returnedPrincipals = [caller];

    for (let i = 1; i < 102; i++) {
      principals.push(`some-principal${i}`);
      if (i < 100) returnedPrincipals.push(`some-principal${i}`);
    }

    const aggregateFake = fake.returns({
      state: {
        principals,
      },
    });

    const result = await main({ root, context, aggregateFn: aggregateFake });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: returnedPrincipals });
  });
  it("should refuse a caller that isn't a member", async () => {
    for (const [state, ctx] of [
      [{}, context],
      [{ principals: [{ ...caller, root: "some-other" }] }, context],
      [{ principals: [caller] }, {}],
      [{ principals: [caller] }, undefined],
      [{ principals: [{}] }, {}],
    ]) {
      const streamFake = fake();
      let error;
      try {
        await main({
          root: "some-root",
          context: ctx,
          aggregateFn: fake.returns({ state }),
          streamFn: streamFake,
        });
      } catch (e) {
        error = e;
      }
      expect(error && error.statusCode).to.equal(403);
      expect(streamFake).to.not.have.been.called;
    }
  });
  it("should stream successfully", async () => {
    const root = "some-root";
    const principals = [caller];

    for (let i = 1; i < 102; i++) {
      principals.push(`some-principal${i}`);
    }

    const aggregateFake = fake.returns({
      state: {
        principals,
      },
    });
    const streamFake = fake();

    await main({
      root,
      context,
      aggregateFn: aggregateFake,
      streamFn: streamFake,
    });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(streamFake).to.have.callCount(102);
    for (const principal of principals) {
      expect(streamFake).to.have.been.calledWith(principal);
    }
  });
});
