import deps from "./deps.js";

export default async ({ payload, context, aggregateFn, queryAggregatesFn }) => {
  // Get the scene, the principal's groups and the principal's roles.
  const [sceneAggregate, principalGroupAggregates, principalAggregate] =
    await Promise.all([
      aggregateFn(payload.scene.root),
      queryAggregatesFn({
        domain: "group",
        queryPairs: [
          {
            key: "principals.root",
            value: context.principal.root,
          },
          {
            key: "principals.service",
            value: context.principal.service,
          },
          {
            key: "principals.network",
            value: context.principal.network,
          },
        ],
      }),
      aggregateFn(context.principal.root, {
        domain: "principal",
        notFoundThrows: false,
      }),
    ]);

  // If the scene has already been deleted, return.
  if (sceneAggregate.state.deleted) return;

  // Make sure the principal is in the scene's group and administers this
  // scene. The gateway only checks for an admin role on some scene.
  if (
    !principalGroupAggregates.some(
      (groupAggregate) =>
        sceneAggregate.state.group.root == groupAggregate.root &&
        sceneAggregate.state.group.service == groupAggregate.service &&
        sceneAggregate.state.group.network == groupAggregate.network
    ) ||
    !((principalAggregate && principalAggregate.state.roles) || []).some(
      (role) =>
        role.id == "SceneAdmin" &&
        role.subject.domain == "scene" &&
        role.subject.root == payload.scene.root &&
        role.subject.service == process.env.SERVICE &&
        role.subject.network == process.env.NETWORK
    )
  )
    throw deps.forbiddenError.message("This scene isn't accessible.");

  return {
    events: [
      // Delete the scene.
      {
        root: payload.scene.root,
        action: "delete",
        payload: { deleted: deps.stringDate() },
      },
    ],
  };
};
