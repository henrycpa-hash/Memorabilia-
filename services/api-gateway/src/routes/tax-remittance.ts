import type { FastifyInstance } from "fastify";

const base = () => process.env.TAX_REMITTANCE_SERVICE_URL || "http://localhost:4061";

async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: request.headers.authorization || ""
    },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerTaxRemittanceGatewayRoutes(app: FastifyInstance) {
  // Obligations
  app.post("/api/tax/obligations", async (request, reply) => {
    const r = await proxy("POST", "/tax/obligations", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/tax/obligations/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/tax/obligations/${id}/status`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/tax/obligations/:id/link-filing", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/tax/obligations/${id}/link-filing`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/tax/obligations/:id/ready-to-remit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/tax/obligations/${id}/ready-to-remit`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/tax/obligations", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/tax/obligations${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/tax/obligations/upcoming-due", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/tax/obligations/upcoming-due${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/tax/obligations/roll-overdue", async (request, reply) => {
    const r = await proxy("POST", "/tax/obligations/roll-overdue", request as never);
    reply.code(r.status).send(r.body);
  });

  // Remittances
  app.post("/api/tax/remittances", async (request, reply) => {
    const r = await proxy("POST", "/tax/remittances", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/tax/remittances/:id/submit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/tax/remittances/${id}/submit`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/tax/remittances/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/tax/remittances/${id}/acknowledge`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/tax/remittances/:id/fail", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/tax/remittances/${id}/fail`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/tax/remittances", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/tax/remittances${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/tax/remittance-pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/tax/remittance-pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/tax/remittance-exceptions", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/tax/remittance-exceptions${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
}
