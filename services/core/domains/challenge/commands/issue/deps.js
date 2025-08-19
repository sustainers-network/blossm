import { create as createJwt } from "@blossm/jwt";
import gcpKms from "@blossm/gcp-kms";
import randomIntOfLength from "@blossm/random-int-of-length";
import { invalidArgument, badRequest } from "@blossm/errors";
import { compare } from "@blossm/crypt";
import { hash } from "@blossm/crypt";
import hmac from "@blossm/hmac";
import gcpSecret from "@blossm/gcp-secret";

import { moment, string as stringDate } from "@blossm/datetime";

export default {
  createJwt,
  sign: gcpKms.sign,
  moment,
  hmacCreate: hmac.create,
  stringDate,
  randomIntOfLength,
  hash,
  invalidArgumentError: invalidArgument,
  badRequestError: badRequest,
  secret: gcpSecret.get,
  compare,
};
