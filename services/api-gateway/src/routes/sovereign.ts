import type { FastifyInstance } from "fastify";

const base = () => process.env.SOVEREIGN_DEPLOYMENT_SERVICE_URL || "http://localhost:4053";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerSovereignGatewayRoutes(app: FastifyInstance) {
  app.post("/api/sovereign/classes", async (request, reply) => {
    const r = await fetch(`${base()}/sovereign/classes`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/classes", async (_req, reply) => {
    const r = await fetch(`${base()}/sovereign/classes`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/classes/by-key/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const r = await fetch(`${base()}/sovereign/classes/by-key/${key}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/classes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sovereign/classes/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/sovereign/assignments", async (request, reply) => {
    const r = await fetch(`${base()}/sovereign/assignments`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/assignments", async (_req, reply) => {
    const r = await fetch(`${base()}/sovereign/assignments`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/assignments/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/sovereign/assignments/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/sovereign/export-controls", async (request, reply) => {
    const r = await fetch(`${base()}/sovereign/export-controls`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/export-controls", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sovereign/export-controls${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sovereign/export-controls/evaluate", async (request, reply) => {
    const r = await fetch(`${base()}/sovereign/export-controls/evaluate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/export-controls/evaluations", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sovereign/export-controls/evaluations${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/sovereign/promotions", async (request, reply) => {
    const r = await fetch(`${base()}/sovereign/promotions`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sovereign/promotions/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sovereign/promotions/${id}/approve`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sovereign/promotions/:id/deny", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sovereign/promotions/${id}/deny`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/promotions", async (_req, reply) => {
    const r = await fetch(`${base()}/sovereign/promotions`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sovereign/promotions/pending", async (_req, reply) => {
    const r = await fetch(`${base()}/sovereign/promotions/pending`);
    reply.code(r.status).send(await r.json());
  });
}
