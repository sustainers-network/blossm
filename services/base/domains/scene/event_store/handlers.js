module.exports = {
  register: (state, payload) => ({
    ...state,
    ...payload,
  }),
  delete: (state, payload) => ({
    ...state,
    ...payload,
  }),
};
