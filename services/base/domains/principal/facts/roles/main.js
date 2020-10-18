module.exports = async ({ query, context, aggregateFn }) => {
  const aggregate = await aggregateFn(context.principal.root);

  const roles = (aggregate.state.roles || []).filter(
    (role) =>
      role.subject.network == context.network &&
      (!query.includes ||
        query.includes.some(
          (i) =>
            (!i.subject.root ||
              role.subject.root == "*" ||
              i.subject.root == role.subject.root) &&
            (!i.subject.domain ||
              role.subject.domain == "*" ||
              i.subject.domain == role.subject.domain) &&
            (!i.subject.service ||
              role.subject.service == "*" ||
              i.subject.service == role.subject.service)
        ))
  );

  return { response: roles };
};
