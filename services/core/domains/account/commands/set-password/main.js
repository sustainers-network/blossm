import deps from "./deps.js";

export default async ({
  payload,
  context,
  aggregateFn,
}) => {
  // Get the current account state
  const account = await aggregateFn(context.account.root);

  // Check if the account already has a password
  if (account.state.password) {
    throw deps.badRequestError.message("Account already has a password set.", {
      info: { reason: "password_already_set" },
    });
  }

  // bcrypt reads only the first 72 bytes, so a longer password would be
  // silently cut short.
  const bytes = Buffer.byteLength(payload.password);
  if (bytes < 8 || bytes > 72)
    throw deps.badRequestError.message(
      "A password must be between 8 and 72 characters.",
      { info: { reason: "password_length" } }
    );

  // Hash the new password
  const hashedPassword = await deps.hash(payload.password);

  return {
    events: [
      {
        action: "set-password",
        root: context.account.root,
        // Numbered, so only one of two requests at once can set the password.
        correctNumber: account.lastEventNumber + 1,
        payload: {
          password: hashedPassword,
        },
      },
    ],
    response: {
      receipt: {
        account: {
          root: context.account.root,
          service: process.env.SERVICE,
          network: process.env.NETWORK,
        },
      },
    },
  };
}; 