module.exports = async (payload) => ({
  ...(payload.view && {
    view: payload.view,
  }),
  id: payload.id,
  ...(payload.trace && { trace: payload.trace }),
  type: payload.type,
  channel: payload.channel,
});
