const difference = require("@blossm/array-difference");
module.exports = {
  "add-principals": (state, payload) => {
    state.principals = state.principals || [];
    return {
      ...state,
      principals: state.principals.concat(
        difference(
          payload.principals.map(
            (principal) =>
              `${principal.root}:${principal.service}:${principal.network}`
          ),
          state.principals.map(
            (principal) =>
              `${principal.root}:${principal.service}:${principal.network}`
          )
        ).map((stringPrincipal) => {
          const [root, service, network] = stringPrincipal.split(":");
          return {
            root,
            service,
            network,
          };
        })
      ),
    };
  },
  "remove-principals": (state, payload) => {
    return {
      ...state,
      ...payload,
      principals: difference(
        state.principals
          ? state.principals.map(
              (principal) =>
                `${principal.root}:${principal.service}:${principal.network}`
            )
          : [],
        payload.principals.map(
          (principal) =>
            `${principal.root}:${principal.service}:${principal.network}`
        )
      ).map((stringPrincipal) => {
        const [root, service, network] = stringPrincipal.split(":");
        return {
          root,
          service,
          network,
        };
      }),
    };
  },
  "add-networks": (state, payload) => {
    state.networks = state.networks || [];
    return {
      ...state,
      networks: state.networks.concat(
        difference(payload.networks, state.networks)
      ),
    };
  },
  "remove-networks": (state, payload) => {
    return {
      ...state,
      networks: difference(state.networks || [], payload.networks),
    };
  },
};
