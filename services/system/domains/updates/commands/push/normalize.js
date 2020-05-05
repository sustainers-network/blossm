module.exports = async (payload) => {
  return {
    view: {
      headers: payload.view.headers,
      body: payload.view.body,
    },
    channel: payload.channel,
  };
};
