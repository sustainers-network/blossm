/**
 * Add services that should be faked
 * in this file.
 */

const grip = require("grip");
const { get: secret } = require("@blossm/gcp-secret");

exports.grip = grip;
exports.secret = secret;
