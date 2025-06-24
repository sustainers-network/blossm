import grip from "grip";
import faasGrip from "faas-grip";
import gcpSecret from "@blossm/gcp-secret";

export default {
  grip,
  faasGrip,
  secret: gcpSecret.get,
};
