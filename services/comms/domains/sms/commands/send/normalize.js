import phoneNumber from "@blossm/phone-number";

export default async (payload) => ({
  to: phoneNumber.format(payload.to),
  message: payload.message,
});
