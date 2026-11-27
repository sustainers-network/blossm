export default {
  create: (state, payload) => ({
    ...state,
    ...payload,
  }),
  revoke: (state, payload) => ({
    ...state,
    ...payload,
  }),
};
