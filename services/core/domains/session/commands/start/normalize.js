module.exports = async (payload) => {
  return {
    device: {
      type: payload.device.type,
      platform: payload.device.platform,
      agent: payload.device.agent,
    },
  };
};
