/**
 * Add services that should be faked
 * in this file.
 */

const uuid = require("@blossm/uuid");
const grip = require("grip");
const faasGrip = require("faas-grip");

exports.uuid = uuid;
exports.grip = grip;
exports.faasGrip = faasGrip;
