import nodemailer from "nodemailer";
import { get as secret } from "@blossm/gcp-secret";

export default {
  nodemailer,
  secret,
};
