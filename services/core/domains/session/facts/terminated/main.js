export default async ({ context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.session.root);
  return { response: aggregate.state.terminated != undefined };
};
