export default ({ payload }) => {
  return {
    ...payload,
    type: payload.type || "single",
  };
};
