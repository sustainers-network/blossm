const { expect } = require("chai").use(require("sinon-chai"));
const { restore, fake, replace, match } = require("sinon");

const main = require("../../main");
const deps = require("../../deps");

const project = "some-project";

process.env.GCP_PROJECT = project;

describe("Fact unit tests", () => {
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

    expect(result).to.equal(token);
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
            key: "access",
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

    expect(result).to.equal(token);
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
            key: "access",
            location: "global",
            version: "1",
            project,
          }) && result == signature
        );
      }),
    });
  });
});
