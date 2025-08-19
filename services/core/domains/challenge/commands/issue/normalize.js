export default (payload) => ({
  email: payload.email.toLowerCase(),
  ...(payload.password && { password: payload.password }),
});
