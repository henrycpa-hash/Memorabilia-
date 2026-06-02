import type { FastifyInstance } from "fastify";

const base = () => process.env.LEGAL_ESCALATION_SERVICE_URL || "http://localhost:4063";

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

export function registerLegalEscalationGatewayRoutes(app: FastifyInstance) {
  app.post("/api/legal-escalations", async (request, reply) => {
    const r = await proxy("POST", "/legal-escalations", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/legal-escalations/:id/severity", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/legal-escalations/${id}/severity`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/legal-escalations/:id/route", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/legal-escalations/${id}/route`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/legal-escalations/:id/matter", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/legal-escalations/${id}/matter`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/legal-escalations/:id/packet", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/legal-escalations/${id}/packet`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/legal-escalations/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/legal-escalations/${id}/resolve`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/legal-escalations/:id/withdraw", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/legal-escalations/${id}/withdraw`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/legal-escalations", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/legal-escalations${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/legal-escalations/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/legal-escalations/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/legal-escalations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/legal-escalations/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/legal-escalations/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/legal-escalations/${id}/events`, request as never);
    reply.code(r.status).send(r.body);
  });
}
