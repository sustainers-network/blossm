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

  // Hash the new password
  const hashedPassword = await deps.hash(payload.password);

  return {
    events: [
      {
        action: "set-password",
        root: context.account.root,
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