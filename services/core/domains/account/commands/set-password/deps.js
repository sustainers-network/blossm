import { hash } from "@blossm/crypt";
import * as errors from "@blossm/errors";

export default {
  hash,
  badRequestError: errors.badRequestError,
  forbiddenError: errors.forbiddenError
}; 