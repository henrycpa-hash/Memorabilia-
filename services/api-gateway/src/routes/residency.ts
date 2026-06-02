import type { FastifyInstance } from "fastify";

const base = () => process.env.DATA_RESIDENCY_SERVICE_URL || "http://localhost:4050";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerResidencyRoutes(app: FastifyInstance) {
  app.post("/api/residency/regions", async (request, reply) => {
    const r = await fetch(`${base()}/residency/regions`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/residency/regions/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/residency/regions/${id}/archive`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/residency/regions", async (_req, reply) => {
    const r = await fetch(`${base()}/residency/regions`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/residency/regions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/residency/regions/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/residency/assignments", async (request, reply) => {
    const r = await fetch(`${base()}/residency/assignments`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/residency/assignments", async (_req, reply) => {
    const r = await fetch(`${base()}/residency/assignments`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/residency/assignments/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/residency/assignments/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/residency/evaluate", async (request, reply) => {
    const r = await fetch(`${base()}/residency/evaluate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/residency/evaluations", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/residency/evaluations${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/residency/evaluations/denials", async (_req, reply) => {
    const r = await fetch(`${base()}/residency/evaluations/denials`);
    reply.code(r.status).send(await r.json());
  });
}
