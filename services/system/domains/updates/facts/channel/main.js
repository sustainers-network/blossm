import { forbidden } from "@blossm/errors";

import deps from "./deps.js";

export default async ({ query, context }) => {
  // The host below is built from the query, so only ask a view gateway of
  // this network or its core network, for a context that the token holds.
  if (
    !query.network ||
    ![process.env.NETWORK, process.env.CORE_NETWORK].includes(query.network) ||
    (query.context && !Object.hasOwn(context || {}, query.context))
  )
    throw forbidden.message("This channel isn't accessible.");

  // 2k padding for old browsers
  const padding = new Array(2048);
  const body = `:${padding.join(" ")}\n\n`;

  const { body: channel } = await deps.get(
    `v${query.context ? `.${query.context}` : ""}.${query.network}`,
    {
      query: {
        context,
        name: query.name,
        ...(query.key && { key: query.key }),
      },
    }
  );

  return {
    response: body,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Grip-Hold": "stream",
      "Grip-Channel": channel,
      "Grip-Keep-Alive": ":\\n\\n; format=cstring; timeout=20",
    },
  };
};
