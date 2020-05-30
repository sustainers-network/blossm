module.exports = {
  start: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  upgrade: (state = {}, payload) => {
    const principal = payload.principal || state.principal;
    return {
      ...state,
      ...(principal && { principal }),
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
