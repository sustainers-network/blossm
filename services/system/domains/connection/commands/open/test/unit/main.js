import * as chai from "chai";
import chaiDateTime from "chai-datetime";
import sinonChai from "sinon-chai";
import { restore, replace, fake, match, useFakeTimers } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(chaiDateTime);
chai.use(sinonChai);
const { expect } = chai;

let clock;
const now = new Date();
const principalRoot = "some-principal-root";
const principal = {
  root: principalRoot,
};
const scene = "some-scene";
const context = {
  principal,
  scene,
};

const domain = "some-domain";
const service = "some-service";
const network = "some-network";
const token = "some-token";
const project = "some-projectl";

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
      context,
    });

    expect(result).to.deep.equal({
      response: {
        token: { network, value: token, key: "access" },
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
      await main({ context });
      //shouldn't get called
      expect(2).to.equal(3);
    } catch (e) {
      expect(e.message).to.equal(errorMessage);
    }
  });
});
