import type { FastifyInstance } from "fastify";

const base = () => process.env.SLA_GOVERNANCE_SERVICE_URL || "http://localhost:4045";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerSlaRoutes(app: FastifyInstance) {
  app.post("/api/sla/profiles", async (request, reply) => {
    const r = await fetch(`${base()}/sla/profiles`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sla/profiles", async (_req, reply) => {
    const r = await fetch(`${base()}/sla/profiles`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sla/profiles/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/sla/profiles/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sla/profiles/by-partner/:partnerId", async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const r = await fetch(`${base()}/sla/profiles/by-partner/${partnerId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sla/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sla/profiles/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sla/profiles/:id/suspend", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sla/profiles/${id}/suspend`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sla/profiles/:id/observations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sla/profiles/${id}/observations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sla/breaches", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sla/breaches${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sla/breaches/open", async (_req, reply) => {
    const r = await fetch(`${base()}/sla/breaches/open`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sla/breaches/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sla/breaches/${id}/resolve`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
}
