const kms = require("@google-cloud/kms");

module.exports = async () => {
  //eslint-disable-next-line
  console.log({ project: process.env.GCP_PROJECT });

  const client = new kms.KeyManagementServiceClient();

  //eslint-disable-next-line
  console.log({ client });

  const versionPath = client.cryptoKeyVersionPath(
    process.env.GCP_PROJECT,
    "global",
    "jwt",
    "access",
    "1",
  );

  //eslint-disable-next-line
  console.log({ versionPath });

  const [{ pem }] = await client.getPublicKey({
    name: versionPath
  });

  //eslint-disable-next-line
  console.log({ pem });
  return pem;
};
