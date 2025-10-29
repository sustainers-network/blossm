import deps from "./deps.js";

export default async ({ payload, context, generateRootFn }) => {
  const root = generateRootFn();

  let options;

  if (process.env.NODE_ENV != "local") {
    // For production, use Mailgun
    const mailgunApiKey = await deps.secret("railgun-authenticator-password");
    
    options = {
      host: "smtp.mailgun.org",
      port: 465,
      secure: true,
      auth: {
        user: "authenticator@dianet.work", // Your Mailgun domain
        pass: mailgunApiKey,
      },
    };
  } else {
    // For local development, use Ethereal test account
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

  // Verify connection configuration
  try {
    await transporter.verify();
  } catch (error) {
    throw new Error(`Email configuration error: ${error.message}`);
  }

  const [info, encryptedTo] = await Promise.all([
    transporter.sendMail({
      from: `"${context.network}" <${payload.from}@${context.network}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.message,
    }),
    deps.encrypt({
      message: payload.to,
      key: "address",
      ring: "email",
      location: "global",
      project: process.env.GCP_PROJECT,
      format: "base64",
    })
  ]);

  return {
    events: [
      {
        action: "send-auth-code",
        payload: {
          ...payload,
          to: encryptedTo
        },
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
