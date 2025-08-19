export default {
  register: (state, payload) => ({
    ...state,
    ...payload,
  }),
  "set-password": (state, payload) => ({
    ...state,
    ...payload,
  }),
};
