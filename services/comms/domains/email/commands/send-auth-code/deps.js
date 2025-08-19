import nodemailer from "nodemailer";
import gcpSecret from "@blossm/gcp-secret";

export default {
  nodemailer,
  secret: gcpSecret.get,
};
