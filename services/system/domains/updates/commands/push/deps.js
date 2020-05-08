/**
 * Add services that should be faked
 * in this file.
 */

const uuid = require("@blossm/uuid");
const grip = require("grip");
const faasGrip = require("faas-grip");
const { get: secret } = require("@blossm/gcp-secret");

exports.uuid = uuid;
exports.grip = grip;
exports.faasGrip = faasGrip;
exports.secret = secret;
