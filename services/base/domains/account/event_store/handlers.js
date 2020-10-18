module.exports = {
  register: (state, payload) => ({
    ...state,
    ...payload,
  }),
};
