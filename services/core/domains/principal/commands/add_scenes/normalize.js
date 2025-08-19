export default async (payload) => ({
    scenes: payload.scenes.map((scene) => ({
        roles: scene.roles,
        root: scene.root,
        service: scene.service,
        network: scene.network,
      })
    )
  });
