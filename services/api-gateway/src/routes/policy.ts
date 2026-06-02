import type { FastifyInstance } from "fastify";

const base = () => process.env.POLICY_COMPLIANCE_SERVICE_URL || "http://localhost:4037";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerPolicyRoutes(app: FastifyInstance) {
  app.post("/api/policies/packs", async (request, reply) => {
    const r = await fetch(`${base()}/policies/packs`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policies/packs", async (_req, reply) => {
    const r = await fetch(`${base()}/policies/packs`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policies/packs/by-type/:type", async (request, reply) => {
    const { type } = request.params as { type: string };
    const r = await fetch(`${base()}/policies/packs/by-type/${type}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policies/packs/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/policies/packs/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policies/packs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/policies/packs/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/policies/packs/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/policies/packs/${id}/archive`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/policies/evaluate", async (request, reply) => {
    const r = await fetch(`${base()}/policies/evaluate`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/policies/evaluate-by-type", async (request, reply) => {
    const r = await fetch(`${base()}/policies/evaluate-by-type`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policies/evaluations", async (_req, reply) => {
    const r = await fetch(`${base()}/policies/evaluations`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policies/evaluations/by-subject/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    const r = await fetch(`${base()}/policies/evaluations/by-subject/${subjectType}/${subjectId}`);
    reply.code(r.status).send(await r.json());
  });
}
