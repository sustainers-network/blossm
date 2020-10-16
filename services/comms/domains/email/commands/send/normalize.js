module.exports = async (payload) => ({
  from: payload.from,
  to: payload.to,
  message: payload.message,
  subject: payload.subject,
});
