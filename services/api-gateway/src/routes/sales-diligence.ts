import type { FastifyInstance } from "fastify";

const base = () => process.env.SALES_DILIGENCE_AUTOMATION_SERVICE_URL || "http://localhost:4059";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerSalesDiligenceRoutes(app: FastifyInstance) {
  app.post("/api/sales/opportunities", async (request, reply) => {
    const r = await fetch(`${base()}/sales/opportunities`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sales/opportunities/:id/advance", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/opportunities/${id}/advance`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sales/opportunities/:id/close-lost", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/opportunities/${id}/close-lost`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sales/opportunities", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sales/opportunities${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sales/opportunities/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/opportunities/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/sales/diligence/workspaces", async (request, reply) => {
    const r = await fetch(`${base()}/sales/diligence/workspaces`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sales/diligence/workspaces/:id/start", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}/start`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.put("/api/sales/diligence/workspaces/:id/items/:itemKey", async (request, reply) => {
    const { id, itemKey } = request.params as { id: string; itemKey: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}/items/${itemKey}`, { method: "PUT", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sales/diligence/workspaces/:id/reuse-suggestions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}/reuse-suggestions`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sales/diligence/workspaces/:id/apply-reuse", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}/apply-reuse`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sales/diligence/workspaces/:id/submit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}/submit`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sales/diligence/workspaces", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sales/diligence/workspaces${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sales/diligence/workspaces/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sales/diligence/workspaces/:id/items", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sales/diligence/workspaces/${id}/items`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/sales/pipeline-summary", async (_req, reply) => {
    const r = await fetch(`${base()}/sales/pipeline-summary`);
    reply.code(r.status).send(await r.json());
  });
}
