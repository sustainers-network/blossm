const { format } = require("@blossm/phone-number");

module.exports = async (payload) => {
  return {
    to: format(payload.to),
    message: payload.message,
  };
};
