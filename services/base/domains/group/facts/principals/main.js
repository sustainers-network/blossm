module.exports = async ({ root, aggregateFn, streamFn }) => {
  const aggregate = await aggregateFn(root);

  const principals = aggregate.state.principals || [];

  if (!streamFn) return { response: principals.slice(0, 100) };
  for (const principal of principals) streamFn(principal);
};
