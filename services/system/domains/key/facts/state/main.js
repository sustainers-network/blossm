import { invalidCredentials } from "@blossm/errors";

export default async ({ root, aggregateFn }) => {
  const aggregate = await aggregateFn(root, {
    domain: "key",
    service: "system",
  });

  // A revoked key authenticates nothing.
  if (aggregate.state.revoked)
    throw invalidCredentials.message("This key has been revoked.");

  return {
    response: {
      root,
      secret: aggregate.state.secret,
      scene: aggregate.state.scene,
      principal: aggregate.state.principal,
      network: aggregate.state.network,
      domain: aggregate.state.domain,
    },
  };
};
