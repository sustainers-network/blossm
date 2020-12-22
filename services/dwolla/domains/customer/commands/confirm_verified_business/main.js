//Setup webhook

module.exports = async ({ payload, createRootFn, queryAggregatesFn }) => {
  const [aggregate] = await queryAggregatesFn({
    query: {
      location: payload.group.root,
    },
  });
  const walletRoot = createRootFn();
  return {
    events: [
      {
        action: "create",
        domain: "wallet",
        service: "money",
        root: walletRoot,
        payload: {
          type: "dwolla",
          root: aggregate.root,
          domain: "customer",
          service: "dwolla",
        },
      },
      {
        action: "confirm-create-verified-business",
        root: aggregate.root,
        payload: {
          exists: true,
        },
      },
    ],
  };
};
