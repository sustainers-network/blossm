import grip from "grip";
import faasGrip from "faas-grip";
import gcpSecret from "@blossm/gcp-secret";
import channelName from "@blossm/channel-name";
import { forbidden, badRequest } from "@blossm/errors";

export default {
  grip,
  faasGrip,
  secret: gcpSecret.get,
  channelName,
  forbiddenError: forbidden,
  badRequestError: badRequest,
};
