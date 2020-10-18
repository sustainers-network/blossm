const grip = require("grip");
const faasGrip = require("faas-grip");
const { get: secret } = require("@blossm/gcp-secret");

exports.grip = grip;
exports.faasGrip = faasGrip;
exports.secret = secret;
