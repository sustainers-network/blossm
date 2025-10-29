export default async ({ context, queryAggregatesFn }) => {
  const groups = await queryAggregatesFn({
    domain: "group",
    queryPairs: [{
      key: "principals.root",
      value: context.principal.root
    },
    {
      key: "principals.service",
      value: context.principal.service
    },
    {
      key: "principals.network",
      value: context.principal.network
    }
  ],
  });

  console.log({ groups });
  return { response: groups.map((group) => ({ root: group.root, service: group.service, network: group.network, state: group.state })) || [] };
};
