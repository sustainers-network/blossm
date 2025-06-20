import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

const sessionRoot = "some-session-root";
const session = {
  root: sessionRoot,
};

const domain = "some-domain";

process.env.DOMAIN = domain;

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const terminated = "some-terminated";

    const aggregateFake = fake.returns({
      state: { terminated },
    });

    const result = await main({
      context: { session },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(result).to.deep.equal({ response: true });
  });
  it("should return false successfully", async () => {
    const aggregateFake = fake.returns({
      state: {},
    });

    const result = await main({
      context: { session },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sessionRoot);
    expect(result).to.deep.equal({ response: false });
  });
});
