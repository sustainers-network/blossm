import { forbidden } from "@blossm/errors";

export default async ({ root, context, aggregateFn, streamFn }) => {
  const aggregate = await aggregateFn(root);

  const principals = aggregate.state.principals || [];

  // Only a member sees who else is in the group.
  const caller = (context && context.principal) || {};
  if (
    !caller.root ||
    !principals.some(
      (p) =>
        p.root == caller.root &&
        p.service == caller.service &&
        p.network == caller.network
    )
  )
    throw forbidden.message("This group isn't accessible.");

  if (!streamFn) return { response: principals.slice(0, 100) };
  for (const principal of principals) streamFn(principal);
};
