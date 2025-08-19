import validator from "@blossm/validator";

export default (payload) => {
  const error = validator.findError([
    validator.string(payload.name, { title: "name", path: "payload.name", maxLength: 20 }),
  ]);
  if (error) throw error;
};
