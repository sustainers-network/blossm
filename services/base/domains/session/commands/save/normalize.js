module.exports = (payload) => ({
  email: payload.email.toLowerCase(),
  password: payload.password,
});
