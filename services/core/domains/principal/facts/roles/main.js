module.exports = async ({ context, root, aggregateFn }) => {
  const aggregate = await aggregateFn(root);

  const roles = aggregate.state.roles.filter(
    (role) => role.network == context.network
  );

  return { response: roles };
};
