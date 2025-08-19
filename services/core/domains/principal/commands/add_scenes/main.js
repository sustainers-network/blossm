import deps from "./deps.js";

export default async ({ payload, context, root, aggregateFn }) => {
  // Get the principal's aggregate.
  const principalAggregate = await aggregateFn(root);

  // Filter for scenes not yet associated with the principal.
  const scenesToAdd = [];
  for (const scene of payload.scenes) {
    if (
      !(principalAggregate.state.scenes || []).some(
        (s) =>
          s.root == scene.root &&
          s.service == scene.service &&
          s.network == scene.network
      )
    )
    scenesToAdd.push(scene);
  }

  // If there are no scenes to add, return.
  if (!scenesToAdd.length) return;

  // Make sure the scenes being removed can be accessed in the current session.
  await Promise.all(
    scenesToAdd.map(async (scene) => {
      // Get the scene's aggregate.
      const sceneAggregate = await aggregateFn(scene.root, {
        domain: "scene",
        service: "core",
      });

      // Make sure the scenes being added are from the same network as the session's context.
      if (sceneAggregate.state.network != context.network)
        throw deps.forbiddenError.message("This scene isn't accessible.");
    })
  );
  
  // Get all the roles for all the scenes being added.
  const rolesToAdd = [];
  for (const scene of scenesToAdd) {
    for (const role of scene.roles)
      rolesToAdd.push({
        id: role,
        subject: {
          root: scene.root,
          domain: "scene",
          service: scene.service,
          network: scene.network,
        },
      });
  }

  return {
    events: [
      // Add the scenes to the principal.
      {
        action: "add-scenes",
        payload: {
          scenes: [
            ...scenesToAdd.map((scene) => ({
                root: scene.root,
                service: scene.service,
                network: scene.network,
              })
            ),
          ],
        },
        root,
      },
      // Add the roles to the principal.
      ...(rolesToAdd.length ? [{
        action: "add-roles",
        payload: {
          roles: rolesToAdd,
        },
        root,
      }] : []),
    ],
  };
};
