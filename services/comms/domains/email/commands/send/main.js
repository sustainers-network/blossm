const deps = require("./deps");

module.exports = async ({ payload, context, generateRootFn }) => {
  const root = generateRootFn();

  const transporter = deps.nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      serviceClient: process.env.GMAIL_CLIENT_ID,
      privateKey: (await deps.secret("gmail-private-key")).replace(
        /\\n/g,
        "\n"
      ),
    },
  });

  await transporter.sendMail({
    from: `${payload.from || "mail"}@${context.network}`,
    to: payload.to,
    subject: payload.subject,
    text: payload.message,
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
        email: {
          root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
};
