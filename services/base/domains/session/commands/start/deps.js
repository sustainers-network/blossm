import { create as createJwt } from "@blossm/jwt";
import { sign } from "@blossm/gcp-kms";
import uuid from "@blossm/uuid";

export default {
  createJwt,
  sign,
  uuid,
};
