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
    )
  )
    throw forbidden.message("These roles can't be added from this scene.");


  if (!(await administers({ context, aggregateFn })))
    throw forbidden.message("These roles can't be added from this scene.");

  // Get the principal's aggregate.
  const principalAggregate = await aggregateFn(root);
  
  // Filter for the roles that do not yet belong to this principal.
  const rolesToAdd = [];
  for (const role of payload.roles) {
    if (
      !(principalAggregate.state.roles || []).some(
        (r) =>
          r.id == role.id &&
          r.subject.root == role.subject.root &&
          r.subject.domain == role.subject.domain &&
          r.subject.service == role.subject.service &&
          r.subject.network == role.subject.network
      )
    )
    rolesToAdd.push(role);
  }

  // If there are no roles to add, return.
  if (!rolesToAdd.length) return;

  return {
    events: [
      // Add the roles to the principal.
      {
        action: "add-roles",
        payload: {
          roles: [
            ...rolesToAdd.map((role) => ({
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
