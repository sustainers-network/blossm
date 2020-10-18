const { expect } = require("chai").use(require("sinon-chai"));
const { restore, replace, fake, match } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const device = { some: "device" };
const payload = { device };
const domain = "some-domain";
const service = "some-service";
const network = "some-network";
const token = "some-token";
const project = "some-projectl";
const ip = "some-ip";

process.env.DOMAIN = domain;
process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_PROJECT = project;

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const root = "some-root";
    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const result = await main({
      payload,
      ip,
    });

    expect(result).to.deep.equal({
      events: [
        {
          payload: {
            ...payload,
            device: {
              ...device,
              ip,
            },
          },
          action: "start",
          correctNumber: 0,
          root,
        },
      ],
      response: {
        context: {
          network,
          session: {
            root,
            service,
            network,
          },
          device: {
            ...device,
            ip,
          },
        },
        receipt: {
          session: {
            root,
            service,
            network,
          },
        },
      },
      tokens: [{ network, type: "access", value: token }],
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/start`,
        audience: [network],
        expiresIn: 7776000000,
      },
      payload: {
        context: {
          network,
          session: {
            root,
            service,
            network,
          },
          device: {
            ...device,
            ip,
          },
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
            key: "access",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
  });
  it("should return successfully with context", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const root = "some-root";
    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const nodeNetwork = "some-node-network";
    const context = {
      network: nodeNetwork,
    };
    const result = await main({
      payload,
      context,
      ip,
    });

    expect(result).to.deep.equal({
      events: [
        {
          payload: {
            device: {
              ...device,
              ip,
            },
          },
          action: "start",
          correctNumber: 0,
          root,
        },
      ],
      response: {
        context: {
          network: nodeNetwork,
          session: {
            root,
            service,
            network,
          },
          device: {
            ...device,
            ip,
          },
        },
        receipt: {
          session: {
            root,
            service,
            network,
          },
        },
      },
      tokens: [{ network: nodeNetwork, type: "access", value: token }],
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/start`,
        audience: [network, nodeNetwork],
        expiresIn: 7776000000,
      },
      payload: {
        context: {
          network: nodeNetwork,
          session: {
            root,
            service,
            network,
          },
          device: {
            ...device,
            ip,
          },
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
            key: "access",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
  });
  it("should return successfully with context on same network", async () => {
    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const root = "some-root";
    const uuidFake = fake.returns(root);
    replace(deps, "uuid", uuidFake);

    const context = { network };
    const result = await main({
      payload,
      context,
      ip,
    });

    expect(result).to.deep.equal({
      events: [
        {
          payload: {
            device: {
              ...device,
              ip,
            },
          },
          action: "start",
          correctNumber: 0,
          root,
        },
      ],
      response: {
        receipt: {
          session: {
            root,
            service,
            network,
          },
        },
        context: {
          network,
          session: {
            root,
            service,
            network,
          },
          device: {
            ...device,
            ip,
          },
        },
      },
      tokens: [{ network, type: "access", value: token }],
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: `${domain}.${service}.${network}/start`,
        audience: [network],
        expiresIn: 7776000000,
      },
      payload: {
        context: {
          network,
          session: {
            root,
            service,
            network,
          },
          device: {
            ...device,
            ip,
          },
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
            key: "access",
            location: "global",
            version: "1",
            project,
          })
        );
      }),
    });
  });
  it("should throw correctly", async () => {
    const errorMessage = "some-error";
    const uuidFake = fake.throws(errorMessage);
    replace(deps, "uuid", uuidFake);
    try {
      await main({ payload });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
