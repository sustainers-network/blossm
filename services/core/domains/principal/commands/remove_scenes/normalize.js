export default async (payload) => ({
    scenes: payload.scenes.map((scene) => ({
        root: scene.root,
        service: scene.service,
        network: scene.network,
      })
    )
  });
