import { create as createJwt } from "@blossm/jwt";
import gcpKms from "@blossm/gcp-kms";
import uuid from "@blossm/uuid";
import { string as stringDate } from "@blossm/datetime";
import { forbidden } from "@blossm/errors";

export default {
  createJwt,
  sign: gcpKms.sign,
  uuid,
  stringDate,
  forbiddenError: forbidden,
};
