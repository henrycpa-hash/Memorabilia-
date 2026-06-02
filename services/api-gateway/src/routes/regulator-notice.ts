import type { FastifyInstance } from "fastify";

const base = () => process.env.REGULATOR_NOTICE_SERVICE_URL || "http://localhost:4064";

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

export function registerRegulatorNoticeGatewayRoutes(app: FastifyInstance) {
  app.post("/api/regulator-notices", async (request, reply) => {
    const r = await proxy("POST", "/regulator-notices", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/:id/request-approval", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-notices/${id}/request-approval`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-notices/${id}/approve`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/:id/submit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-notices/${id}/submit`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/:id/respond", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-notices/${id}/respond`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-notices/${id}/close`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/submissions/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-notices/submissions/${id}/acknowledge`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/submissions/reject", async (request, reply) => {
    const r = await proxy("POST", "/regulator-notices/submissions/reject", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices/submissions", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-notices/submissions${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-notices${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices/upcoming-deadlines", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-notices/upcoming-deadlines${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/regulator-notices/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices/routing", async (request, reply) => {
    const r = await proxy("GET", "/regulator-notices/routing", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices/routing/lookup", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-notices/routing/lookup${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-notices/routing", async (request, reply) => {
    const r = await proxy("POST", "/regulator-notices/routing", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-notices/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/regulator-notices/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
}
