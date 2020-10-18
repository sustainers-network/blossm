module.exports = async ({ context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.scene.root);
  return { response: aggregate.state.deleted != undefined };
};
