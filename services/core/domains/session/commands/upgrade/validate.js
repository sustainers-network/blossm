import validator from "@blossm/validator";

export default (payload) => {
  for (const key in payload) {
    const error = validator.findError([
      validator.object(payload[key], { title: [key], path: `payload.${key}` }),
    ]);
    if (error) throw error;

    const referenceError = validator.findError([
      validator.string(payload[key].root, {
        title: `${key} root`,
        path: `payload.${key}.root`,
      }),
      validator.string(payload[key].service, {
        title: `${key} service`,
        path: `payload.${key}.service`,
      }),
      validator.domain(payload[key].network, {
        title: `${key} network`,
        path: `payload.${key}.network`,
      }),
    ]);
    if (referenceError) throw referenceError;
  }
};
