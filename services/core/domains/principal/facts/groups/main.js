module.exports = async ({ context, aggregateFn }) => {
  //TODO
  console.log({ context });
  const aggregate = await aggregateFn(context.principal.root);

  //TODO
  console.log({ aggregate, state: aggregate.state, context });

  //TODO this could get weird of groups scales
  // const groups = aggregate.groups.filter(
  //   (group) => group.network == context.network
  // );

  //TODO
  return { response: aggregate.state.groups || [] };
};
