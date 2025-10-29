export default async (payload) => ({
  ...(payload.role && { role: payload.role }),
  subject: {
    root: payload.subject.root,
    domain: payload.subject.domain,
    service: payload.subject.service,
    network: payload.subject.network,
  },
});
