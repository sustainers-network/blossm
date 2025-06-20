import { create as createJwt } from "@blossm/jwt";
import { sign } from "@blossm/gcp-kms";
import {
  fineTimestamp,
  stringFromDate,
  string as stringDate,
} from "@blossm/datetime";
import { badRequest, forbidden } from "@blossm/errors";

export default {
  createJwt,
  sign,
  fineTimestamp,
  stringFromDate,
  badRequestError: badRequest,
  forbiddenError: forbidden,
  stringDate,
};
