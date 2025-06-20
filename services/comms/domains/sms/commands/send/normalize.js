import { format } from "@blossm/phone-number";

export default async (payload) => ({
  to: format(payload.to),
  message: payload.message,
});
