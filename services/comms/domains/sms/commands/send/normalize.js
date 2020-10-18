const { format } = require("@blossm/phone-number");

module.exports = async (payload) => ({
  to: format(payload.to),
  message: payload.message,
});
