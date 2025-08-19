import { create as createJwt } from "@blossm/jwt";
import gcpKms from "@blossm/gcp-kms";
import {
  string as stringDate,
  fineTimestamp,
  stringFromDate,
} from "@blossm/datetime";
import { badRequest } from "@blossm/errors";

export default {
  createJwt,
  sign: gcpKms.sign,
  stringDate,
  fineTimestamp,
  stringFromDate,
  badRequestError: badRequest,
};
