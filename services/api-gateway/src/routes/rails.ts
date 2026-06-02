import type { FastifyInstance } from "fastify";

const base = () => process.env.REMITTANCE_RAIL_CONNECTOR_SERVICE_URL || "http://localhost:4067";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerRailsGatewayRoutes(app: FastifyInstance) {
  app.post("/api/rails", async (request, reply) => {
    const r = await proxy("POST", "/rails", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/rails/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/rails/${id}/status`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/rails", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/rails${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/rails/select", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/rails/select${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/rails/submissions", async (request, reply) => {
    const r = await proxy("POST", "/rails/submissions", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/rails/submissions/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/rails/submissions/${id}/acknowledge`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/rails/submissions/:id/reconcile", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/rails/submissions/${id}/reconcile`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/rails/submissions/:id/fail", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/rails/submissions/${id}/fail`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/rails/submissions/:id/retry", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/rails/submissions/${id}/retry`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/rails/submissions", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/rails/submissions${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/rails/submissions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/rails/submissions/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/rails/submissions/:id/receipts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/rails/submissions/${id}/receipts`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/rails/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/rails/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
}
