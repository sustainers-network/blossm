const kms = require("@google-cloud/kms");

let cache;

const standardizedAlgorithm = algorithm => {
  switch (algorithm) {
    case "RSA_SIGN_PSS_2048_SHA256":
    case "RSA_SIGN_PSS_3072_SHA256":
    case "RSA_SIGN_PSS_4096_SHA256":
    case "RSA_SIGN_PKCS1_2048_SHA256":
    case "RSA_SIGN_PKCS1_3072_SHA256":
    case "RSA_SIGN_PKCS1_4096_SHA256":
      return "RS256";
    case "RSA_SIGN_PSS_4096_SHA512":
    case "RSA_SIGN_PKCS1_4096_SHA512":
      return "RS512";
    case "EC_SIGN_P256_SHA256":
      return "ES256";
    case "EC_SIGN_P384_SHA384":
      return "ES384";
    default: return false
  }
}
module.exports = async () => {
  if (cache) return cache;
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

  const [{ pem: newKey, algorithm: newAlgorithm }] = await client.getPublicKey({
    name: versionPath
  });

  cache = {
    key: newKey,
    algorithm: standardizedAlgorithm(newAlgorithm)
  }
  //eslint-disable-next-line
  console.log({ cache });
  return cache;
};
