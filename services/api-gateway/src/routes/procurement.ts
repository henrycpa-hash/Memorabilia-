import type { FastifyInstance } from "fastify";

const base = () => process.env.PROCUREMENT_AUTOMATION_SERVICE_URL || "http://localhost:4052";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerProcurementRoutes(app: FastifyInstance) {
  app.post("/api/procurement/questionnaires", async (request, reply) => {
    const r = await fetch(`${base()}/procurement/questionnaires`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/procurement/questionnaires/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/questionnaires/${id}/archive`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/questionnaires", async (_req, reply) => {
    const r = await fetch(`${base()}/procurement/questionnaires`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/questionnaires/by-template/:templateKey", async (request, reply) => {
    const { templateKey } = request.params as { templateKey: string };
    const r = await fetch(`${base()}/procurement/questionnaires/by-template/${templateKey}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/questionnaires/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/questionnaires/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/procurement/responses", async (request, reply) => {
    const r = await fetch(`${base()}/procurement/responses`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.put("/api/procurement/responses/:id/answers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/responses/${id}/answers`, { method: "PUT", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/responses/:id/reuse-suggestions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/responses/${id}/reuse-suggestions`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/procurement/responses/:id/submit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/responses/${id}/submit`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/procurement/responses/:id/mark-delivered", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/responses/${id}/mark-delivered`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/responses/:id/score", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/responses/${id}/score`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/responses", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/procurement/responses${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/responses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/procurement/responses/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/procurement/evidence-maps", async (request, reply) => {
    const r = await fetch(`${base()}/procurement/evidence-maps`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/procurement/evidence-maps", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/procurement/evidence-maps${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
}
