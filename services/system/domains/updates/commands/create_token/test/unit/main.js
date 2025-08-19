import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake, replace, match } from "sinon";

import main from "../../main.js";
import deps from "../../deps.js";

chai.use(sinonChai);
const { expect } = chai;

const project = "some-project";

process.env.GCP_PROJECT = project;

describe("Command unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const exp = 9999;
    const iss = "some-iss";
    const sub = "some-sub";
    const aud = "some-aud";
    const claims = {
      iss,
      sub,
      aud,
      exp,
    };

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const token = "some-token";
    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const result = await main({ claims, context });

    expect(result).to.deep.equal({ response: { token } });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: sub,
        audience: aud,
        expiresIn: 3600000,
      },
      payload: {
        context,
      },
      signFn: match((fn) => {
        const message = "some-message";
        const result = fn(message);
        return (
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "updates",
            location: "global",
            version: "1",
            project,
          }) && result == signature
        );
      }),
    });
  });
  it("should return successfully if current exp is less than one hour", async () => {
    const exp = new Date(new Date().getTime() + 60000);
    const iss = "some-iss";
    const sub = "some-sub";
    const aud = "some-aud";
    const claims = {
      iss,
      sub,
      aud,
      exp: Date.parse(exp) - deps.fineTimestamp(),
    };

    const signature = "some-signature";
    const signFake = fake.returns(signature);
    replace(deps, "sign", signFake);

    const token = "some-token";
    const createJwtFake = fake.returns(token);
    replace(deps, "createJwt", createJwtFake);

    const result = await main({ claims, context });

    expect(result).to.deep.equal({ response: { token } });
    expect(createJwtFake).to.have.been.calledWith({
      options: {
        issuer: iss,
        subject: sub,
        audience: aud,
        expiresIn: 3600000,
      },
      payload: {
        context,
      },
      signFn: match((fn) => {
        const message = "some-message";
        const result = fn(message);
        return (
          signFake.calledWith({
            message,
            ring: "jwt",
            key: "updates",
            location: "global",
            version: "1",
            project,
          }) && result == signature
        );
      }),
    });
  });
});
