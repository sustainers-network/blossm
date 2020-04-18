module.exports = {
  start: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  upgrade: (state = {}, payload) => {
    const principle = payload.principle || state.principle;
    return {
      ...state,
      ...(principle && { principle }),
    };
  },
  terminate: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  "change-scene": (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
};
