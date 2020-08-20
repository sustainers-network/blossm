module.exports = async ({ payload, root, aggregateFn }) => {
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
  if (nonDuplicatedScenes.length == 0) return {};

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
