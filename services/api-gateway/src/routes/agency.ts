import type { FastifyInstance } from "fastify";

const base = () => process.env.AGENCY_TEAM_SERVICE_URL || "http://localhost:4032";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerAgencyRoutes(app: FastifyInstance) {
  app.post("/api/orgs", async (request, reply) => {
    const r = await fetch(`${base()}/orgs`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs", async (_req, reply) => {
    const r = await fetch(`${base()}/orgs`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/orgs/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/orgs/:id/members", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/members`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs/:id/members", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/members`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/orgs/:id/affiliate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/affiliate`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs/:id/affiliations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/affiliations`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/orgs/:id/approvals", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/approvals`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs/:id/approvals", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/approvals`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/orgs/:id/approvals/pending", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/orgs/${id}/approvals/pending`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/approvals/:taskId/decide", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const r = await fetch(`${base()}/approvals/${taskId}/decide`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
}
