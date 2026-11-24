import { forbidden } from "@blossm/errors";

// The roles a scene admin may hand out, and only for the scene their session is in.
const sceneRoles = ["SceneAdmin", "SceneViewer"];
const isCallersScene = (subject, scene) =>
  scene != undefined &&
  subject.domain == "scene" &&
  subject.root == scene.root &&
  subject.service == scene.service &&
  subject.network == scene.network;

// The gateway's answer can be minutes old, so read the caller's roles now.
const administers = async ({ context, aggregateFn }) => {
  const caller = await aggregateFn(context.principal.root, {
    notFoundThrows: false,
  });
  return ((caller && caller.state.roles) || []).some(
    (role) =>
      role.id == "SceneAdmin" && isCallersScene(role.subject, context.scene)
  );
};

export default async ({ payload, root, context, aggregateFn }) => {
  if (
    !payload.roles.every(
      (role) =>
        sceneRoles.includes(role.id) &&
        isCallersScene(role.subject, context.scene)
    ) ||
    !payload.subjects.every((subject) => isCallersScene(subject, context.scene))
  )
    throw forbidden.message("These roles can't be removed from this scene.");

  if (!(await administers({ context, aggregateFn })))
    throw forbidden.message("These roles can't be removed from this scene.");

  // An admin can't remove their own admin role, so a scene always keeps one.
  if (
    root == context.principal.root &&
    (payload.subjects.length > 0 ||
      payload.roles.some((role) => role.id == "SceneAdmin"))
  )
    throw forbidden.message("You can't remove your own admin role.");


  // Get the principal's aggregate.
  const principalAggregate = await aggregateFn(root);
  
  // Filter for roles that are associated with this principal.
  const rolesToRemove = [];
  
  // Remove the roles specified in the payload.
  for (const role of payload.roles) {
    if (
      (principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.subject.root == role.subject.root &&
          r.subject.domain == role.subject.domain &&
          r.subject.service == role.subject.service &&
          r.subject.network == role.subject.network &&
          // We'll remove roles for given subjects next.
          !payload.subjects.some(
            (s) =>
              s.root == r.subject.root &&
              s.domain == r.subject.domain &&
              s.service == r.subject.service &&
              s.network == r.subject.network
          )
      )
    )
    rolesToRemove.push(role);
  }
  
  // Remove roles for the subjects specified in the payload.
  for (const subject of payload.subjects) {
    for (const role of principalAggregate.state.roles || []) {
      if (
        role.subject.root == subject.root &&
        role.subject.domain == subject.domain &&
        role.subject.service == subject.service &&
        role.subject.network == subject.network
      )
      rolesToRemove.push(role);
    }
  }

  // If there are no roles to remove, return.
  if (!rolesToRemove.length) return;

  return {
    events: [
      // Remove the roles from the principal.
      {
        action: "remove-roles",
        payload: {
          roles: [
            ...rolesToRemove.map((role) => ({
                id: role.id,
                subject: {
                  root: role.subject.root,
                  domain: role.subject.domain,
                  service: role.subject.service,
                  network: role.subject.network,
                },
              })
            ),
          ],
        },
        root,
      },
    ],
  };
};
