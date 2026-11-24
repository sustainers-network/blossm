import { hash } from "@blossm/crypt";
import { badRequest } from "@blossm/errors";

export default {
  hash,
  badRequestError: badRequest,
};
