import nodemailer from "nodemailer";
import gcpSecret from "@blossm/gcp-secret";
import gcpKms from "@blossm/gcp-kms";

export default {
  nodemailer,
  secret: gcpSecret.get,
  encrypt: gcpKms.encrypt,
};
