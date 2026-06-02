import type { FastifyInstance } from "fastify";

const base = () => process.env.COLLABORATIVE_REDLINING_SERVICE_URL || "http://localhost:4062";

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

export function registerCollabRedlineGatewayRoutes(app: FastifyInstance) {
  app.post("/api/collab-redline/workspaces", async (request, reply) => {
    const r = await proxy("POST", "/collab-redline/workspaces", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/collab-redline/workspaces/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/collab-redline/workspaces/${id}/status`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/collab-redline/workspaces/:id/version", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/collab-redline/workspaces/${id}/version`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/workspaces/:id/reviewers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/collab-redline/workspaces/${id}/reviewers`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/workspaces/:id/promote", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/collab-redline/workspaces/${id}/promote`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/collab-redline/workspaces", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/collab-redline/workspaces${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/collab-redline/workspaces/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/collab-redline/workspaces/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/collab-redline/workspaces/:id/summary", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/collab-redline/workspaces/${id}/summary`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/collab-redline/workspaces/:id/comments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/collab-redline/workspaces/${id}/comments${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/collab-redline/workspaces/:id/positions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/collab-redline/workspaces/${id}/positions`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/collab-redline/workspaces/:id/checkpoints", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/collab-redline/workspaces/${id}/checkpoints`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/comments", async (request, reply) => {
    const r = await proxy("POST", "/collab-redline/comments", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/comments/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/collab-redline/comments/${id}/resolve`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/positions", async (request, reply) => {
    const r = await proxy("POST", "/collab-redline/positions", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/checkpoints", async (request, reply) => {
    const r = await proxy("POST", "/collab-redline/checkpoints", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/collab-redline/checkpoints/:id/decide", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/collab-redline/checkpoints/${id}/decide`, request as never);
    reply.code(r.status).send(r.body);
  });
}
