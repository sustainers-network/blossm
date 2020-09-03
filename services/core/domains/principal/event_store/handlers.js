const difference = require("@blossm/array-difference");
module.exports = {
  "add-roles": (state, payload) => {
    state.roles = state.roles || [];
    return {
      ...state,
      ...payload,
      roles: state.roles.concat(
        difference(
          payload.roles.map(
            (role) =>
              `${role.id}:${role.subject.root}:${role.subject.domain}:${role.subject.service}:${role.subject.network}`
          ),
          state.roles.map(
            (role) =>
              `${role.id}:${role.subject.root}:${role.subject.domain}:${role.subject.service}:${role.subject.network}`
          )
        ).map((stringRole) => {
          const [id, root, domain, service, network] = stringRole.split(":");
          return {
            id,
            subject: {
              root,
              domain,
              service,
              network,
            },
          };
        })
      ),
    };
  },
  "remove-roles": (state, payload) => {
    return {
      ...state,
      ...payload,
      roles: difference(
        state.roles
          ? state.roles.map(
              (role) =>
                `${role.id}:${role.subject.root}:${role.subject.domain}:${role.subject.service}:${role.subject.network}`
            )
          : [],
        payload.roles.map(
          (role) =>
            `${role.id}:${role.subject.root}:${role.subject.domain}:${role.subject.service}:${role.subject.network}`
        )
      ).map((stringRole) => {
        const [id, root, domain, service, network] = stringRole.split(":");
        return {
          id,
          subject: {
            root,
            domain,
            service,
            network,
          },
        };
      }),
    };
  },
  "add-scenes": (state, payload) => {
    state.scenes = state.scenes || [];
    return {
      ...state,
      scenes: state.scenes.concat(
        difference(
          payload.scenes.map(
            (scene) => `${scene.root}:${scene.service}:${scene.network}`
          ),
          state.scenes.map(
            (scene) => `${scene.root}:${scene.service}:${scene.network}`
          )
        ).map((stringScene) => {
          const [root, service, network] = stringScene.split(":");
          return {
            root,
            service,
            network,
          };
        })
      ),
    };
  },
  "remove-scenes": (state, payload) => {
    return {
      ...state,
      ...payload,
      scenes: difference(
        state.scenes
          ? state.scenes.map(
              (scene) => `${scene.root}:${scene.service}:${scene.network}`
            )
          : [],
        payload.scenes.map(
          (scene) => `${scene.root}:${scene.service}:${scene.network}`
        )
      ).map((stringScene) => {
        const [root, service, network] = stringScene.split(":");
        return {
          root,
          service,
          network,
        };
      }),
    };
  },
  "add-groups": (state, payload) => {
    state.groups = state.groups || [];
    return {
      ...state,
      ...payload,
      groups: state.groups.concat(
        difference(
          payload.groups.map(
            (group) => `${group.root}:${group.service}:${group.network}`
          ),
          state.groups.map(
            (group) => `${group.root}:${group.service}:${group.network}`
          )
        ).map((stringGroup) => {
          const [root, service, network] = stringGroup.split(":");
          return {
            root,
            service,
            network,
          };
        })
      ),
    };
  },
  "remove-groups": (state, payload) => {
    return {
      ...state,
      ...payload,
      groups: difference(
        state.groups
          ? state.groups.map(
              (group) => `${group.root}:${group.service}:${group.network}`
            )
          : [],
        payload.groups.map(
          (group) => `${group.root}:${group.service}:${group.network}`
        )
      ).map((stringGroup) => {
        const [root, service, network] = stringGroup.split(":");
        return {
          root,
          service,
          network,
        };
      }),
    };
  },
};
