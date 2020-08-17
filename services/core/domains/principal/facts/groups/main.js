module.exports = async ({ context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.principal.root);

  const groups = aggregate.state.groups.filter(
    (group) => group.network == context.network
  );

  return { response: groups };
};
