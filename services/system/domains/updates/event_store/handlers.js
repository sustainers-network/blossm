module.exports = {
  push: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
};
