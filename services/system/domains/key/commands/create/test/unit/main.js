const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, useFakeTimers, stub, fake } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();

const principleRoot = "some-principle-root";

const service = "some-service";
const network = "some-network";

process.env.SERVICE = service;
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
    const roleRoot1 = "some-role-root";
    const roleRoot2 = "some-role-root";
    const name = "some-name";
    const nodeRoot = "some-node-root";
    const nodeService = "some-node-service";
    const nodeNetwork = "some-node-network";
    const hash = "some-hash";
    const secret = "some-secret;";
    const keyRoot = "some-key-root";

    const payload = {
      name,
      roles: [roleRoot1, roleRoot2]
    };

    const uuidFake = stub()
      .onFirstCall()
      .returns(keyRoot)
      .onSecondCall()
      .returns(principleRoot);

    replace(deps, "uuid", uuidFake);

    const randomStringOfLengthFake = fake.returns(secret);

    replace(deps, "randomStringOfLength", randomStringOfLengthFake);

    const hashFake = fake.returns(hash);

    replace(deps, "hash", hashFake);

    const node = {
      root: nodeRoot,
      service: nodeService,
      network: nodeNetwork
    };

    const context = {
      domain: "node",
      node
    };

    const nodeStateNetwork = "some-node-network";
    const aggregateFnFake = fake.returns({
      aggregate: { network: nodeStateNetwork }
    });
    const result = await main({
      payload,
      context,
      aggregateFn: aggregateFnFake
    });

    expect(aggregateFnFake).to.have.been.calledWith(nodeRoot, {
      domain: "node",
      service: nodeService,
      network: nodeNetwork
    });
    expect(uuidFake).to.have.been.calledTwice;
    expect(uuidFake).to.have.been.calledWith();
    expect(randomStringOfLengthFake).to.have.been.calledOnce;
    expect(randomStringOfLengthFake).to.have.been.calledWith(40);
    expect(hashFake).to.have.been.calledWith(secret);

    expect(result).to.deep.equal({
      events: [
        {
          domain: "principle",
          service: "core",
          action: "add-roles",
          payload: {
            roles: [
              {
                id: roleRoot1,
                root: "some-tmp-root",
                service,
                network
              },
              {
                id: roleRoot2,
                root: "some-tmp-root",
                service,
                network
              }
            ]
          },
          root: principleRoot
        },
        {
          action: "create",
          payload: {
            name: payload.name,
            network: nodeStateNetwork,
            node,
            principle: {
              root: principleRoot,
              service: "core",
              network
            },
            secret: hash
          },
          root: keyRoot,
          correctNumber: 0
        }
      ],
      response: {
        root: keyRoot,
        secret,
        references: { key: { root: keyRoot, service, network } }
      }
    });
  });
  it("should throw correctly if not in node", async () => {
    const errorMessage = "some-error";
    const messageFake = fake.throws(errorMessage);
    replace(deps, "forbiddenError", {
      message: messageFake
    });
    try {
      await main({ context: {} });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(messageFake).to.have.been.calledWith(
        "A key can only be made by a node."
      );
      expect(e.message).to.equal(errorMessage);
    }
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const hashFake = fake.throws(errorMessage);
    replace(deps, "hash", hashFake);
    try {
      await main({ context: { domain: "node", node: "some-node" } });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
