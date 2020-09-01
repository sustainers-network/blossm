module.exports = async ({ query, context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.principal.root);

  const roles = (aggregate.state.roles || []).filter(
    (role) =>
      role.network == context.network &&
      (!query.includes ||
        query.includes.some(
          (i) =>
            (!i.root || role.root == "*" || i.root == role.root) &&
            (!i.domain || role.domain == "*" || i.domain == role.domain) &&
            (!i.service || role.service == "*" || i.service == role.service)
        ))
  );

  return { response: roles };
};
