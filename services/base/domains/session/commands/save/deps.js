import difference from "@blossm/array-difference";
import { hash, compare } from "@blossm/crypt";
import { validate as emailValidator } from "@blossm/email-validator";
import { invalidArgument, badRequest } from "@blossm/errors";

export default {
  difference,
  hash,
  compare,
  emailValidator,
  invalidArgumentError: invalidArgument,
  badRequestError: badRequest,
};
