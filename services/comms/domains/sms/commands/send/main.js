const deps = require("./deps");

let sms;

module.exports = async ({ payload }) => {
  const root = deps.uuid();

  // Lazily load up the sms connection.
  if (!sms) {
    sms = deps.sms(
      await deps.secret("twilio-account-sid"),
      await deps.secret("twilio-auth-token")
    );
  }

  await sms.send({
    to: payload.to,
    from: process.env.TWILIO_SENDING_PHONE_NUMBER,
    body: payload.message,
  });

  return {
    events: [
      {
        action: "send",
        payload,
        root,
      },
    ],
    response: {
      receipt: {
        sms: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
