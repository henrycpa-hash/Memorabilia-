import type { FastifyInstance } from "fastify";

const base = () => process.env.ENTERPRISE_PLANNING_SERVICE_URL || "http://localhost:4065";

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

export function registerPlanningGatewayRoutes(app: FastifyInstance) {
  app.post("/api/planning/accounts", async (request, reply) => {
    const r = await proxy("POST", "/planning/accounts", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/planning/accounts/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/planning/accounts/${id}/status`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/accounts", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/planning/accounts${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/accounts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/planning/accounts/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/planning/plans", async (request, reply) => {
    const r = await proxy("POST", "/planning/plans", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/planning/plans/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/planning/plans/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/plans", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/planning/plans${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/planning/scenarios", async (request, reply) => {
    const r = await proxy("POST", "/planning/scenarios", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/scenarios", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/planning/scenarios${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/planning/forecasts", async (request, reply) => {
    const r = await proxy("POST", "/planning/forecasts", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/forecasts", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/planning/forecasts${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/forecasts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/planning/forecasts/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/planning/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/planning/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
}
