import deps from "./deps.js";

// A part of a channel. A comma would add a second channel, and a dot would let
// one part pass for two.
const plain = (value) =>
  typeof value == "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
// A network is a domain name, so it has dots.
const domain = (value) =>
  typeof value == "string" && /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(value);

// The channel is built here, never taken from the caller. A request through
// the gateway carries the context of a node's key, and can only reach channels
// of the network that key was made for. Internal requests have no context and
// belong to this network.
const channelFor = ({ payload, context }) => {
  const network = context ? context.network : process.env.NETWORK;
  if (!domain(network))
    throw deps.forbiddenError.message("These updates can't be pushed.");

  const { name, key, context: viewContext, principal } = payload;
  if (
    !plain(name) ||
    (key != undefined && !plain(key)) ||
    (viewContext &&
      !(
        plain(viewContext.root) &&
        plain(viewContext.domain) &&
        plain(viewContext.service) &&
        domain(viewContext.network)
      )) ||
    (principal &&
      !(
        plain(principal.root) &&
        plain(principal.service) &&
        domain(principal.network)
      ))
  )
    throw deps.badRequestError.message("This channel isn't valid.");

  // The name's format has one owner, which refuses parts it can't write
  // unambiguously. Anything it refuses beyond the checks above is the
  // caller's mistake too.
  try {
    return deps.channelName({
      name,
      network,
      ...(viewContext && { context: viewContext }),
      ...(key && { key }),
      ...(principal && { principal }),
    });
  } catch (error) {
    if (error instanceof TypeError)
      throw deps.badRequestError.message("This channel isn't valid.");
    throw error;
  }
};

export default async ({ payload, context }) => {
  const channel = channelFor({ payload, context });

  // Lazily set the environment variable.
  if (!process.env.GRIP_URL) {
    process.env.GRIP_URL = `${
      process.env.NODE_ENV == "local" ? "http" : "https"
    }://api.fanout.io/realm/${process.env.FANOUT_REALM_ID}?iss=${
      process.env.FANOUT_REALM_ID
    }&key=base64:${await deps.secret("fanout-realm-key")}`;
  }

  await deps.faasGrip.publish(
    channel,
    new deps.grip.HttpStreamFormat(
      // `event: update\ndata: ${JSON.stringify({
      //   ...(payload.view && { view: payload.view }),
      //   id: payload.id,
      //   trace: payload.trace,
      //   type: payload.type,
      // })}\n\n`
      `data: ${JSON.stringify({
        ...(payload.view && { view: payload.view }),
        id: payload.id,
        trace: payload.trace,
        type: payload.type,
      })}\n\n`
    )
  );
};
