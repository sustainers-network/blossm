import { forbidden } from "@blossm/errors";

import deps from "./deps.js";

const plain = (value) =>
  typeof value == "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);

export default async ({ query, context }) => {
  // The host below is built from the query, so only ask a view gateway of
  // this network or its core network, for a context that the token holds.
  // The name and key become part of the channel, where a comma would add a
  // second channel, so those take plain names only.
  if (
    !query.network ||
    ![process.env.NETWORK, process.env.CORE_NETWORK].includes(query.network) ||
    (query.context &&
      (!plain(query.context) ||
        !Object.hasOwn(context || {}, query.context))) ||
    !plain(query.name) ||
    (query.key && !plain(query.key))
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
