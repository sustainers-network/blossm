import deps from "./deps.js";

export default async ({ payload, context, aggregateFn, queryAggregatesFn }) => {
  console.log("context: ", context);
  // Get the scene and principal aggregates.
  const [sceneAggregate, principalGroupAggregates] = await Promise.all([
    aggregateFn(payload.scene.root),
    queryAggregatesFn({
      domain: "group",
      queryPairs: [{
        key: "principals.root",
        value: context.principal.root,
      },
      {
        key: "principals.service",
        value: context.principal.service,
      },
      {
        key: "principals.network",
        value: context.principal.network,
      }],
    }),
  ]);
  
  console.log("hmm: ", principalGroupAggregates);
   
  // if (principalGroupAggregates && principalGroupAggregates.length) {
  //   console.log("principalGroupAggregates: ", {root: principalGroupAggregates[0].state.group.root, service: principalGroupAggregates[0].state.group.service, network: principalGroupAggregates[0].state.group.network});
  // }
  console.log("sceneAggregate: ", sceneAggregate);

  // If the scene has already been deleted, return.
  if (sceneAggregate.state.deleted) return;

  // Make sure the principal has the scene being deleted.
  if (
    !principalGroupAggregates.some(
      (groupAggregate) => sceneAggregate.state.group.root == groupAggregate.root &&
        sceneAggregate.state.group.service == groupAggregate.service &&
        sceneAggregate.state.group.network == groupAggregate.network
    )
  )
    throw deps.forbiddenError.message("This scene isn't accessible.");

  return {
    events: [
      // Delete the scene.
      {
        root: payload.scene.root,
        action: "delete",
        payload: { deleted: deps.stringDate() },
      },
    ],
  };
};
