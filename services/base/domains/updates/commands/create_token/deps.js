import { create as createJwt } from "@blossm/jwt";
import gcpKms from "@blossm/gcp-kms";
import uuid from "@blossm/uuid";
import { fineTimestamp } from "@blossm/datetime";

export default {
  createJwt,
  sign: gcpKms.sign,
  uuid,
  fineTimestamp,
};
