import type { FastifyInstance } from "fastify";

const base = () => process.env.FEDERATED_ANALYTICS_SERVICE_URL || "http://localhost:4044";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerFederatedAnalyticsRoutes(app: FastifyInstance) {
  app.post("/api/federated-analytics/peer-groups", async (request, reply) => {
    const r = await fetch(`${base()}/federated-analytics/peer-groups`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/federated-analytics/peer-groups", async (_req, reply) => {
    const r = await fetch(`${base()}/federated-analytics/peer-groups`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/federated-analytics/peer-groups/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/federated-analytics/peer-groups/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/federated-analytics/benchmarks", async (request, reply) => {
    const r = await fetch(`${base()}/federated-analytics/benchmarks`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/federated-analytics/benchmarks", async (_req, reply) => {
    const r = await fetch(`${base()}/federated-analytics/benchmarks`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/federated-analytics/benchmarks/by-group/:groupId", async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const r = await fetch(`${base()}/federated-analytics/benchmarks/by-group/${groupId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/federated-analytics/benchmarks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/federated-analytics/benchmarks/${id}`);
    reply.code(r.status).send(await r.json());
  });
}
