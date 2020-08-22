module.exports = async ({ context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.principal.root);

  //TODO this could get weird if the number of groups in a principal scales.

  return { response: aggregate.state.groups || [] };
};
