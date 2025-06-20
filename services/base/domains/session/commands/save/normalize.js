export default (payload) => ({
  email: payload.email.toLowerCase(),
  password: payload.password,
});
