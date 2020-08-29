const deps = require("./deps");

module.exports = async ({ payload, root, context, aggregateFn }) => {
  const existingScenes = [];
  const principalAggregate = await aggregateFn(root);
  for (const scene of payload.scenes) {
    if (
      (principalAggregate.state.scenes || []).some(
        (s) =>
          s.root == scene.root &&
          s.service == scene.service &&
          s.network == scene.network
      )
    )
      existingScenes.push(scene);
  }
  if (existingScenes.length == 0) return;

  await Promise.all(
    existingScenes.map(async (scene) => {
      const aggregate = await aggregateFn(scene.root, {
        domain: "scene",
        service: "core",
      });
      if (aggregate.state.network != context.network)
        throw deps.forbiddenError.message("This scene isn't accessible.");
    })
  );

  return {
    events: [
      {
        action: "remove-scenes",
        payload: {
          scenes: [
            ...existingScenes.map((scene) => {
              return {
                root: scene.root,
                service: scene.service,
                network: scene.network || process.env.NETWORK,
              };
            }),
          ],
        },
        root,
      },
      {
        action: "remove-roles",
        payload: {
          roles: [
            ...existingScenes.map((scene) => {
              return {
                id: scene.role,
                root: scene.root,
                service: scene.service,
                network: scene.network || process.env.NETWORK,
              };
            }),
          ],
        },
        root,
      },
    ],
  };
};
