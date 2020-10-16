module.exports = {
  send: (state, payload) => ({
    ...state,
    ...payload,
  }),
};
