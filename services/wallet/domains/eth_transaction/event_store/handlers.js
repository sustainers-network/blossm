export default {
  register: (state, payload) => ({
    ...state,
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  monitor: (state, payload) => ({
    ...state,
    ...payload,
    updatedAt: new Date(),
  }),
  "update-status": (state, payload) => ({
    ...state,
    ...payload,
    updatedAt: new Date(),
  }),
};
