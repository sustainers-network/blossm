module.exports = {
  send: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
};
