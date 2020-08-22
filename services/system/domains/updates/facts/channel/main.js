const deps = require("./deps");

module.exports = async ({ query, context }) => {
  // 2k padding for old browsers
  const padding = new Array(2048);
  const body = `:${padding.join(" ")}\n\n`;

  const { body: channel } = await deps.get(
    `v${query.context ? `.${query.context}` : ""}.${query.network}`,
    {
      query: {
        context,
        name: query.name,
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
