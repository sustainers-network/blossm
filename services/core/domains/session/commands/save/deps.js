import difference from "@blossm/array-difference";
import { hash } from "@blossm/crypt";
import { invalidArgument, badRequest } from "@blossm/errors";
import gcpKms from "@blossm/gcp-kms";
import hmac from "@blossm/hmac";
import gcpSecret from "@blossm/gcp-secret";

export default {
  difference,
  hash,
  encrypt: gcpKms.encrypt,
  hmacCreate: hmac.create,
  secret: gcpSecret.get,
  invalidArgumentError: invalidArgument,
  badRequestError: badRequest,
};
