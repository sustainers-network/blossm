import deps from "./deps.js";

export default async ({
  payload,
  root,
  context,
  aggregateFn,
  readFactFn,
}) => {
  // Get the principal's aggregate.
  const principalAggregate = await aggregateFn(root);

  // Filter for the scenes that the principal is currently associated with..
  const scenesToRemove = [];
  for (const scene of payload.scenes) {
    if (
      (principalAggregate.state.scenes || []).some(
        (s) =>
          s.root == scene.root &&
          s.service == scene.service &&
          s.network == scene.network
      )
    )
    scenesToRemove.push(scene);
  }

  // If there are no scenes to remove, return.
  if (!scenesToRemove.length) return;

  // Make sure the scenes being removed can be accessed in the current session.
  await Promise.all(
    scenesToRemove.map(async (scene) => {
      // Get the aggregate for the scene.
      const aggregate = await aggregateFn(scene.root, {
        domain: "scene",
        service: "core",
      });

      // Make sure the scenes being removed are from the same network as the session's context.
      if (aggregate.state.network != context.network)
        throw deps.forbiddenError.message("This scene isn't accessible.");
    })
  );
  
  // Get all roles from the principal that apply to the scene being removed.
  const { body: roles } = await readFactFn({
    name: "roles",
    domain: "principal",
    service: "core",
    query: {
      includes: scenesToRemove.map((scene) => ({
        root: scene.root,
        domain: "scene",
        service: scene.service,
      })),
    },
  });
  
  // Format the roles in terms of the scene they apply to.
  const rolesToRemove = [];
  for (const scene of scenesToRemove) {
    for (const role of roles.filter((role) => role.root == scene.root))
      rolesToRemove.push({
        id: role.id,
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
      // Remove the scenes from this principal.
      {
        action: "remove-scenes",
        payload: {
          scenes: [
            ...scenesToRemove.map((scene) => ({
                root: scene.root,
                service: scene.service,
                network: scene.network,
              })
            ),
          ],
        },
        root,
      },
      // Remove the roles from this principal that apply to the scenes being removed.
      ...(rolesToRemove.length ? [{
        action: "remove-roles",
        payload: {
          roles: rolesToRemove,
        },
        root,
      }] : []),
    ],
  };
};
