export default {
  issue: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  answer: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  fail: (state) => {
    return {
      ...state,
      attempts: (state.attempts || 0) + 1,
    };
  },
};
