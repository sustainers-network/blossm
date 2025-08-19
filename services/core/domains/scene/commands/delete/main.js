import deps from "./deps.js";

export default async ({ payload, context, aggregateFn }) => {
  // Get the scene and principal aggregates.
  const [sceneAggregate, principalAggregate] = await Promise.all([
    aggregateFn(payload.scene.root),
    aggregateFn(context.principal.root, {
      domain: "principal",
      service: "core",
    }),
  ]);
  
  // If the scene has already been deleted, return.
  if (sceneAggregate.state.deleted) return;
  
  // Make sure the principal has the scene being deleted.
  if (
    !(principalAggregate.state.scenes || []).some(
      (scene) =>
        scene.root == payload.scene.root &&
        scene.service == payload.scene.service &&
        scene.network == payload.scene.network
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
      // TODO should we remove the scene from the principal?
    ],
  };
};
