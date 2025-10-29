import difference from "@blossm/array-difference";

export default {
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
  "set-subject": (state, payload) => ({
    ...state,
    ...payload
  })
};
