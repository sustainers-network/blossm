const deps = require("./deps");

module.exports = async ({ payload, context, generateRootFn }) => {
  const root = generateRootFn();

  let options;

  if (process.env.NODE_ENV != "local") {
    options = {
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
    };
  } else {
    const testAccount = await deps.nodemailer.createTestAccount();

    options = {
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    };
  }

  const transporter = deps.nodemailer.createTransport(options);

  const info = await transporter.sendMail({
    from: `"${context.network}" <${payload.from}@${context.network}>`,
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
      info,
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
