const { expect } = require("chai")
  .use(require("sinon-chai"));
const { restore, fake, replace } = require("sinon");

const kms = require("@google-cloud/kms");

const main = require("../../main");

const pem = "some-pem";

describe("Command handler unit tests", () => {
  afterEach(() => {
    restore();
  });
  it("should return successfully", async () => {
    const path = "some-path";
    const pathFake = fake.returns(path);

    const kmsClient = function() {};
    kmsClient.prototype.cryptoKeyVersionPath = pathFake;
    const getKeyFake = fake.returns([{ pem }]);
    kmsClient.prototype.getPublicKey = getKeyFake;
    replace(kms, "KeyManagementServiceClient", kmsClient);

    const result = await main();
    expect(result).to.equal(pem);
  });
});
