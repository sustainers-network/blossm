import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const sceneRoot = "some-scene-root";
const scene = {
  root: sceneRoot,
};

const domain = "some-domain";

process.env.DOMAIN = domain;

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const deleted = "some-deleted";

    const aggregateFake = fake.returns({
      state: { deleted },
    });

    const result = await main({
      context: { scene },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sceneRoot);
    expect(result).to.deep.equal({ response: true });
  });
  it("should return false successfully", async () => {
    const aggregateFake = fake.returns({
      state: {},
    });

    const result = await main({
      context: { scene },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(sceneRoot);
    expect(result).to.deep.equal({ response: false });
  });
});
