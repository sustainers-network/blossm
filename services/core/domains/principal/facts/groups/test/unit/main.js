import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake } from "sinon";

import main from "../../main.js";

chai.use(sinonChai);
const { expect } = chai;

const service = "some-service";
const network = "some-network";

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const root = "some-root";
    const group = {
      root: "some-group-root",
      state: "some-state",
      headers: "some-random-headers",
    };
    const groups = [group];

    const queryAggregatesFake = fake.returns(groups);

    const context = {
      network,
      principal: {
        root,
        service,
        network,
      },
    };

    const result = await main({ context, queryAggregatesFn: queryAggregatesFake });

    expect(queryAggregatesFake).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: root,
      },
      {
        key: "principals.service",
        value: service,
      },
      {
        key: "principals.network",
        value: network,
      }],
    });
    expect(result).to.deep.equal({ response: [{ root: group.root, service: group.service, network: group.network, state: group.state }] });
  });
  it("should return successfully with no groups set", async () => {
    const root = "some-root";

    const queryAggregatesFake = fake.returns([]);

    const context = {
      network,
      principal: {
        root,
        service,
        network,
      },
    };

    const result = await main({ context, queryAggregatesFn: queryAggregatesFake });

    expect(queryAggregatesFake).to.have.been.calledWith({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: root,
      },
      {
        key: "principals.service",
        value: service,
      },
      {
        key: "principals.network",
        value: network,
      }],
    });
    expect(result).to.deep.equal({ response: [] });
  });
});
