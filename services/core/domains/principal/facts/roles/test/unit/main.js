const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake } = require("sinon");

const main = require("../../main");

describe("Fact unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const network = "some-network";
    const root = "some-root";
    const role = {
      id: "some-id",
      network,
    };
    const roles = [
      role,
      {
        id: "some-other-id",
        network: "some-other-network",
      },
    ];

    const aggregateFake = fake.returns({
      state: {
        roles,
      },
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({
      context,
      query: {},
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [role] });
  });
  it("should return successfully with correct includes", async () => {
    const network = "some-network";
    const root = "some-root";
    const role = {
      id: "some-id",
      network,
    };
    const roles = [
      role,
      {
        id: "some-other-id",
        network: "some-other-network",
      },
    ];

    const aggregateFake = fake.returns({
      state: {
        roles,
      },
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({
      context,
      query: {
        includes: [
          {
            ...role,
          },
        ],
      },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [role] });
  });
  it("should return successfully with bad includes", async () => {
    const network = "some-network";
    const root = "some-root";
    const role = {
      id: "some-id",
      network,
    };
    const roles = [
      role,
      {
        id: "some-other-id",
        network: "some-other-network",
      },
    ];

    const aggregateFake = fake.returns({
      state: {
        roles,
      },
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({
      context,
      query: {
        includes: [
          {
            root: "some-bogus",
          },
        ],
      },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [] });
  });
  it("should return successfully if state.roles is not set", async () => {
    const network = "some-network";
    const root = "some-root";

    const aggregateFake = fake.returns({
      state: {},
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({ context, aggregateFn: aggregateFake });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [] });
  });
  it("should return successfully with wildcard includes", async () => {
    const network = "some-network";
    const root = "some-root";
    const role = {
      id: "some-id",
      network,
    };
    const roles = [
      role,
      {
        id: "some-other-id",
        root: "*",
        network,
      },
    ];

    const aggregateFake = fake.returns({
      state: {
        roles,
      },
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({
      context,
      query: {
        includes: [
          {
            root: "some-bogus",
          },
        ],
      },
      aggregateFn: aggregateFake,
    });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({
      response: [
        {
          id: "some-other-id",
          root: "*",
          network,
        },
      ],
    });
  });
  it("should return successfully if state.roles is not set", async () => {
    const network = "some-network";
    const root = "some-root";

    const aggregateFake = fake.returns({
      state: {},
    });
    const context = {
      network,
      principal: {
        root,
      },
    };

    const result = await main({ context, aggregateFn: aggregateFake });

    expect(aggregateFake).to.have.been.calledWith(root);
    expect(result).to.deep.equal({ response: [] });
  });
});
