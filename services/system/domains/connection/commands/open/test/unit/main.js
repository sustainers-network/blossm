const { expect } = require("chai")
  .use(require("chai-datetime"))
  .use(require("sinon-chai"));
const { restore, replace, fake, match, useFakeTimers } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

let clock;
const now = new Date();
const principalRoot = "some-principal-root";
const principal = {
  root: principalRoot,
};
const scene = "some-scene";
const key = "some-key";
const context = {
  principal,
  scene,
  key,
};

const domain = "some-domain";
const service = "some-service";
const network = "some-network";
const token = "some-token";
const project = "some-projectl";

const payloadKey = "some-payload-key";
const payload = {
  key: payloadKey,
};

process.env.DOMAIN = domain;
process.env.SERVICE = service;
process.env.NETWORK = network;
process.env.GCP_PROJECT = project;

describe("Command handler unit tests", () => {
  beforeEach(() => {
    clock = useFakeTimers(now.getTime());
  });
  afterEach(() => {
    clock.restore();
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
      context,
    });

    expect(result).to.deep.equal({
      events: [
        {
          payload: {
            scene,
            key,
            opened: deps.stringDate(),
          },
          action: "open",
          root,
        },
      ],
      response: {
        token: { network, key: payloadKey, value: token },
        receipt: { connection: { root, service, network } },
      },
    });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        subject: principalRoot,
        issuer: `${domain}.${service}.${network}/open`,
        audience: network,
        expiresIn: 7776000000,
      },
      payload: {
        context: {
          ...context,
          connection: {
            root,
            service,
            network,
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
            key: payload.key,
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
      await main({ context });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
