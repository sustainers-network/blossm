import deps from "./deps.js";
import { MILLISECONDS_IN_HOUR } from "@blossm/duration-consts";

const ONE_HOUR = MILLISECONDS_IN_HOUR;

export default async ({ context, claims }) => ({
  response: {
    token: await deps.createJwt({
      options: {
        issuer: claims.iss,
        subject: claims.sub,
        audience: claims.aud,
        expiresIn: Math.min(
          ONE_HOUR,
          Date.parse(claims.exp) - deps.fineTimestamp()
        ),
      },
      payload: {
        context,
      },
      signFn: (message) =>
        deps.sign({
          message,
          ring: "jwt",
          key: "updates",
          location: "global",
          version: "1",
          project: process.env.GCP_PROJECT,
        }),
    }),
  },
});
