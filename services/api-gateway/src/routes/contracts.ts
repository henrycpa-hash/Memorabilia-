import type { FastifyInstance } from "fastify";

const base = () => process.env.CONTRACT_LIFECYCLE_SERVICE_URL || "http://localhost:4041";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerContractRoutes(app: FastifyInstance) {
  app.post("/api/contracts/agreements", async (request, reply) => {
    const r = await fetch(`${base()}/contracts/agreements`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/contracts/agreements", async (_req, reply) => {
    const r = await fetch(`${base()}/contracts/agreements`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/contracts/agreements/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/contracts/agreements/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/contracts/agreements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/agreements/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}/approve`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/agreements/:id/sign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}/sign`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/rollup", async (request, reply) => {
    const r = await fetch(`${base()}/contracts/rollup`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/agreements/:id/amendments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}/amendments`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/contracts/agreements/:id/amendments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}/amendments`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/agreements/:id/obligations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}/obligations`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/contracts/agreements/:id/obligations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/agreements/${id}/obligations`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/obligations/:id/satisfy", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/contracts/obligations/${id}/satisfy`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/contracts/obligations/due-within/:days", async (request, reply) => {
    const { days } = request.params as { days: string };
    const r = await fetch(`${base()}/contracts/obligations/due-within/${days}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/contracts/resolve-governing", async (request, reply) => {
    const r = await fetch(`${base()}/contracts/resolve-governing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body || {}) });
    reply.code(r.status).send(await r.json());
  });
}
