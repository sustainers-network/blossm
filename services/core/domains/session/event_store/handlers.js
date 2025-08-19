export default {
  start: (state, payload) => ({
    ...state,
    ...payload,
  }),
  //Only the upgrade payload's principal should be reflected in the state.
  // TODO: why?
  // DID: fix.
  upgrade: (state, payload) => ({
    ...state,
    ...payload,
    // ...(payload.principal && { principal: payload.principal }),
  }),
  terminate: (state, payload) => ({
    ...state,
    ...payload,
  }),
  "change-scene": (state, payload) => ({
    ...state,
    ...payload,
  }),
};
