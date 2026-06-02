import type { FastifyInstance } from "fastify";

const base = () => process.env.LEGAL_SYSTEMS_CONNECTOR_SERVICE_URL || "http://localhost:4051";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerLegalConnectorRoutes(app: FastifyInstance) {
  app.post("/api/legal-connector/matters", async (request, reply) => {
    const r = await fetch(`${base()}/legal-connector/matters`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-connector/matters/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/matters/${id}/status`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-connector/matters", async (_req, reply) => {
    const r = await fetch(`${base()}/legal-connector/matters`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-connector/matters/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/matters/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-connector/matters/:id/exports", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/matters/${id}/exports`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-connector/exports/:id/callback", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/exports/${id}/callback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-connector/exports", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/legal-connector/exports${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-connector/exports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/exports/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-connector/matters/:id/holds", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/matters/${id}/holds`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-connector/holds/:id/release", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-connector/holds/${id}/release`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-connector/holds", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/legal-connector/holds${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
}
