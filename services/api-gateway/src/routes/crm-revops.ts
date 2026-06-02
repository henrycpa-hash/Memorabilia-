import type { FastifyInstance } from "fastify";

const base = () => process.env.CRM_REVOPS_SYNC_SERVICE_URL || "http://localhost:4071";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerCrmRevopsGatewayRoutes(app: FastifyInstance) {
  app.post("/api/crm-revops/accounts", async (request, reply) => {
    const r = await proxy("POST", "/crm-revops/accounts", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/crm-revops/accounts", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/crm-revops/accounts${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/crm-revops/opportunities", async (request, reply) => {
    const r = await proxy("POST", "/crm-revops/opportunities", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/crm-revops/opportunities", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/crm-revops/opportunities${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/crm-revops/reconciliations", async (request, reply) => {
    const r = await proxy("POST", "/crm-revops/reconciliations", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/crm-revops/reconciliations", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/crm-revops/reconciliations${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/crm-revops/mark-stale", async (request, reply) => {
    const r = await proxy("POST", "/crm-revops/mark-stale", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/crm-revops/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/crm-revops/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
}
