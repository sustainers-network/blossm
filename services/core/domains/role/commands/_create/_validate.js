/**
 * This file is optional. Get rid of the leading underscore _ from the file's name to require it.
 * It can be used to customize your validator script.
 *
 * By default, validation follows the rules defined in your blossm.yaml 'payload' definition.
 * If this file is active it will override the blossm.yaml validation specs.
 *
 */

import validator from "@blossm/validator";

export default (payload) => {
  const error = validator.findError([
    validator.string(payload.name, { title: "name", path: "payload.name" }),
  ]);
  if (error) throw error;
};
