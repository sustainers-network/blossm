module.exports = async ({ context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.principal.root);

  const roles = (aggregate.state.roles || []).filter(
    (role) => role.network == context.network
  );

  return { response: roles };
};
