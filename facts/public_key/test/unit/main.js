import * as chai from "chai";
import sinonChai from "sinon-chai";
import { restore, fake, replace } from "sinon";

chai.use(sinonChai);
const { expect } = chai;

import kms from "@google-cloud/kms";

import main from "../../main.js";

const pem = "some-pem";
const algorithm = "EC_SIGN_P256_SHA256";

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const path = "some-path";
    const pathFake = fake.returns(path);

    const kmsClient = function () {};
    kmsClient.prototype.cryptoKeyVersionPath = pathFake;
    const getKeyFake = fake.returns([{ pem, algorithm }]);
    kmsClient.prototype.getPublicKey = getKeyFake;
    replace(kms, "KeyManagementServiceClient", kmsClient);

    const project = "some-project";

    process.env.GCP_PROJECT = project;

    const result = await main();

    expect(getKeyFake).to.have.been.calledWith({
      name: path,
    });
    expect(pathFake).to.have.been.calledWith(
      project,
      "global",
      "jwt",
      "access",
      "1"
    );
    expect(result).to.deep.equal({
      response: { key: pem, algorithm: "ES256" },
    });
    const otherResult = await main();
    expect(pathFake).to.have.been.calledOnce;
    expect(otherResult).to.deep.equal({
      response: { key: pem, algorithm: "ES256" },
    });
  });
});
