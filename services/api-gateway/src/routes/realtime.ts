import type { FastifyInstance } from "fastify";

const base = () => process.env.REALTIME_COLLABORATION_SERVICE_URL || "http://localhost:4068";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerRealtimeGatewayRoutes(app: FastifyInstance) {
  app.post("/api/realtime/sessions", async (request, reply) => {
    const r = await proxy("POST", "/realtime/sessions", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/realtime/sessions/:id/pause", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/realtime/sessions/${id}/pause`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/realtime/sessions/:id/resume", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/realtime/sessions/${id}/resume`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/realtime/sessions/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/realtime/sessions/${id}/close`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/realtime/sessions", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/realtime/sessions${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/realtime/sessions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/realtime/sessions/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/realtime/sessions/:id/presence", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/realtime/sessions/${id}/presence`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.delete("/api/realtime/sessions/:id/presence", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("DELETE", `/realtime/sessions/${id}/presence`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/realtime/sessions/:id/presence", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/realtime/sessions/${id}/presence`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/realtime/presence/sweep-idle", async (request, reply) => {
    const r = await proxy("POST", "/realtime/presence/sweep-idle", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/realtime/sessions/:id/operations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/realtime/sessions/${id}/operations`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/realtime/sessions/:id/operations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/realtime/sessions/${id}/operations${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/realtime/sessions/:id/checkpoints", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/realtime/sessions/${id}/checkpoints`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/realtime/sessions/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/realtime/sessions/${id}/events`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/realtime/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/realtime/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
}
