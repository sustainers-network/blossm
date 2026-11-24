export default {
  declared: (state, payload) => ({ ...state, ...payload }),
  "not-declared": (state) => state,
};
