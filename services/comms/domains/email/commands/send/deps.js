const nodemailer = require("nodemailer");
const { get: secret } = require("@blossm/gcp-secret");

exports.nodemailer = nodemailer;
exports.secret = secret;
