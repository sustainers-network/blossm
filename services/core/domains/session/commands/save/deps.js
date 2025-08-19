import difference from "@blossm/array-difference";
import { hash, compare } from "@blossm/crypt";
import { invalidArgument, badRequest } from "@blossm/errors";
import gcpKms from "@blossm/gcp-kms";
import hmac from "@blossm/hmac";
import gcpSecret from "@blossm/gcp-secret";

export default {
  difference,
  hash,
  compare,
  encrypt: gcpKms.encrypt,
  hmacCreate: hmac.create,
  secret: gcpSecret.get,
  invalidArgumentError: invalidArgument,
  badRequestError: badRequest,
};
