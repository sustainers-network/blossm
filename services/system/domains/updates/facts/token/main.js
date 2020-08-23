const deps = require("./deps");
const { MILLISECONDS_IN_HOUR } = require("@blossm/duration-consts");

const ONE_HOUR = MILLISECONDS_IN_HOUR;

module.exports = ({ context, claims }) =>
  deps.createJwt({
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
        key: "access",
        location: "global",
        version: "1",
        project: process.env.GCP_PROJECT,
      }),
  });
