import type { FastifyInstance } from "fastify";

const base = () => process.env.PRIVACY_GOVERNANCE_SERVICE_URL || "http://localhost:4049";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerPrivacyRoutes(app: FastifyInstance) {
  app.post("/api/privacy/policies", async (request, reply) => {
    const r = await fetch(`${base()}/privacy/policies`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/privacy/policies/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/privacy/policies/${id}/archive`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy/policies", async (_req, reply) => {
    const r = await fetch(`${base()}/privacy/policies`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy/policies/by-scope/:scopeType", async (request, reply) => {
    const { scopeType } = request.params as { scopeType: string };
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/privacy/policies/by-scope/${scopeType}${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy/policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/privacy/policies/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/privacy/release-checks", async (request, reply) => {
    const r = await fetch(`${base()}/privacy/release-checks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy/release-checks", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/privacy/release-checks${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy/release-checks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/privacy/release-checks/${id}`);
    reply.code(r.status).send(await r.json());
  });
}
