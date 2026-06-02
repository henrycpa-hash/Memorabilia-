import type { FastifyInstance } from "fastify";

const base = () => process.env.COLLECTIONS_DUNNING_SERVICE_URL || "http://localhost:4046";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerCollectionsRoutes(app: FastifyInstance) {
  app.post("/api/collections/receivables", async (request, reply) => {
    const r = await fetch(`${base()}/collections/receivables`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/receivables/from-statement/:statementId", async (request, reply) => {
    const { statementId } = request.params as { statementId: string };
    const r = await fetch(`${base()}/collections/receivables/from-statement/${statementId}`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/receivables", async (_req, reply) => {
    const r = await fetch(`${base()}/collections/receivables`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/receivables/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/collections/receivables/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/receivables/by-bucket/:bucket", async (request, reply) => {
    const { bucket } = request.params as { bucket: string };
    const r = await fetch(`${base()}/collections/receivables/by-bucket/${bucket}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/receivables/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/collections/receivables/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/receivables/:id/payment", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/collections/receivables/${id}/payment`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/dunning/run", async (request, reply) => {
    const r = await fetch(`${base()}/collections/dunning/run`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/dunning/runs", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/collections/dunning/runs${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/receivables/:id/promise-to-pay", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/collections/receivables/${id}/promise-to-pay`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/promises/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/collections/promises/${id}/resolve`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/promises", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/collections/promises${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/receivables/:id/writeoffs", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/collections/receivables/${id}/writeoffs`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/collections/writeoffs/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/collections/writeoffs/${id}/approve`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/writeoffs", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/collections/writeoffs${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/collections/tenant-summary/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/collections/tenant-summary/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
}
