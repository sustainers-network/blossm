export default ({ payload }) => {
  return {
    ...payload,
    type: payload.type || "single",
    status: payload.status || "submitted",
  };
};
