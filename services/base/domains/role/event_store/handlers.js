const difference = require("@blossm/array-difference");

module.exports = {
  create: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  "add-permissions": (state, payload) => {
    state.permissions = state.permissions || [];
    return {
      ...state,
      permissions: state.permissions.concat(
        difference(
          payload.permissions.map(
            (permission) =>
              `${permission.service}:${permission.domain}:${permission.privilege}`
          ),
          state.permissions.map(
            (permission) =>
              `${permission.service}:${permission.domain}:${permission.privilege}`
          )
        ).map((stringPermission) => {
          const [service, domain, privilege] = stringPermission.split(":");
          return {
            service,
            domain,
            privilege,
          };
        })
      ),
    };
  },
  "remove-permissions": (state, payload) => {
    return {
      ...state,
      permissions: difference(
        state.permissions.map(
          (permission) =>
            `${permission.service}:${permission.domain}:${permission.privilege}`
        ),
        payload.permissions.map(
          (permission) =>
            `${permission.service}:${permission.domain}:${permission.privilege}`
        )
      ).map((stringPermission) => {
        const [service, domain, privilege] = stringPermission.split(":");
        return {
          privilege,
          domain,
          service,
        };
      }),
    };
  },
};
