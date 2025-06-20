import uuid from "@blossm/uuid";
import { forbidden, badRequest } from "@blossm/errors";

export default {
  uuid,
  forbiddenError: forbidden,
  badRequestError: badRequest,
};
