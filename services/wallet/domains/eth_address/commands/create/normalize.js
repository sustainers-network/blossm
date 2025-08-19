export default async (payload) => ({
  ...(payload.name && { name: payload.name }),
});
