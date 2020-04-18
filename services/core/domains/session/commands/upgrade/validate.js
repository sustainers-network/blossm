const { findError, string, object, domain } = require("@blossm/validator");

module.exports = (payload) => {
  for (const key in payload) {
    const error = findError([
      object(payload[key], { title: [key], path: `payload.${key}` }),
    ]);
    if (error) throw error;

    const referenceError = findError([
      string(payload[key].root, {
        title: `${key} root`,
        path: `payload.${key}.root`,
      }),
      string(payload[key].service, {
        title: `${key} service`,
        path: `payload.${key}.service`,
      }),
      domain(payload[key].network, {
        title: `${key} network`,
        path: `payload.${key}.network`,
      }),
    ]);
    if (referenceError) throw referenceError;
  }
};
