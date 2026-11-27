const parts = (object, keys) =>
  Object.fromEntries(keys.map((key) => [key, object[key]]));

export default async (payload) => ({
  ...(payload.view && {
    view: payload.view,
  }),
  id: payload.id,
  ...(payload.trace && { trace: payload.trace }),
  type: payload.type,
  name: payload.name,
  ...(payload.context && {
    context: parts(payload.context, ["root", "domain", "service", "network"]),
  }),
  ...(payload.principal && {
    principal: parts(payload.principal, ["root", "service", "network"]),
  }),
  ...(payload.key && { key: payload.key }),
});
