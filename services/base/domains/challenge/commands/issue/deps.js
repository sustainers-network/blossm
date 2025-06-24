import { create as createJwt } from "@blossm/jwt";
import gcpKms from "@blossm/gcp-kms";
import randomIntOfLength from "@blossm/random-int-of-length";
import { invalidArgument, badRequest } from "@blossm/errors";
import { compare } from "@blossm/crypt";

import { moment, string as stringDate } from "@blossm/datetime";

export default {
  createJwt,
  sign: gcpKms.sign,
  moment,
  stringDate,
  randomIntOfLength,
  invalidArgumentError: invalidArgument,
  badRequestError: badRequest,
  compare,
};
