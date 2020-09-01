const deps = require("./deps");

module.exports = async ({ payload, context, root, aggregateFn }) => {
  const nonDuplicatedScenes = [];
  const principalAggregate = await aggregateFn(root);
  for (const scene of payload.scenes) {
    if (
      !(principalAggregate.state.scenes || []).some(
        (s) =>
          s.root == scene.root &&
          s.service == scene.service &&
          s.network == scene.network
      )
    )
      nonDuplicatedScenes.push(scene);
  }
  if (nonDuplicatedScenes.length == 0) return;

  await Promise.all(
    nonDuplicatedScenes.map(async (scene) => {
      const aggregate = await aggregateFn(scene.root, {
        domain: "scene",
        service: "core",
      });
      if (aggregate.state.network != context.network)
        throw deps.forbiddenError.message("This scene isn't accessible.");
    })
  );

  const flattenedRoles = [];
  for (const scene of nonDuplicatedScenes) {
    for (const role of scene.roles)
      flattenedRoles.push({
        id: role,
        root: scene.root,
        domain: "scene",
        service: scene.service,
        network: scene.network,
      });
  }

  return {
    events: [
      {
        action: "add-scenes",
        payload: {
          scenes: [
            ...nonDuplicatedScenes.map((scene) => {
              return {
                root: scene.root,
                service: scene.service,
                network: scene.network,
              };
            }),
          ],
        },
        root,
      },
      {
        action: "add-roles",
        payload: {
          roles: flattenedRoles,
        },
        root,
      },
    ],
  };
};
