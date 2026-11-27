import { forbidden } from "@blossm/errors";

export default async ({ root, context, aggregateFn, streamFn }) => {
  const aggregate = await aggregateFn(root);

  const principals = aggregate.state.principals || [];

  // Only a member sees who else is in the group. Projections also read this
  // to find whom to push a view's updates to: one inside this network calls
  // with no context at all, and another network's calls with its node's key.
  // The gateway route must stay protected, so that no context means internal.
  const caller = (context && context.principal) || {};
  if (
    context &&
    !context.key &&
    (!caller.root ||
      !principals.some(
      (p) =>
        p.root == caller.root &&
        p.service == caller.service &&
        p.network == caller.network
      ))
  )
    throw forbidden.message("This group isn't accessible.");

  if (!streamFn) return { response: principals.slice(0, 100) };
  for (const principal of principals) streamFn(principal);
};
