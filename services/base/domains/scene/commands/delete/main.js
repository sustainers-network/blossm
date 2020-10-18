const deps = require("./deps");

module.exports = async ({ payload, context, aggregateFn }) => {
  const [sceneAggregate, principalAggregate] = await Promise.all([
    aggregateFn(payload.scene.root),
    aggregateFn(context.principal.root, {
      domain: "principal",
      service: "base",
    }),
  ]);

  if (sceneAggregate.state.deleted)
    throw deps.badRequestError.message("This scene has already been deleted.");

  if (
    !principalAggregate.state.scenes.some(
      (scene) =>
        scene.root == payload.scene.root &&
        scene.service == payload.scene.service &&
        scene.network == payload.scene.network
    )
  )
    throw deps.forbiddenError.message("This scene isn't accessible.");

  return {
    events: [
      {
        root: payload.scene.root,
        action: "delete",
        payload: { deleted: deps.stringDate() },
      },
    ],
  };
};
