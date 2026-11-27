import { resolveTxt } from "node:dns/promises";
import { string as stringDate } from "@blossm/datetime";
import { forbidden, badRequest } from "@blossm/errors";

export default {
  resolveTxt,
  stringDate,
  forbiddenError: forbidden,
  badRequestError: badRequest,
};
