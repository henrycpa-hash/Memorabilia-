import type { FastifyInstance } from "fastify";

const base = () => process.env.SOVEREIGNTY_INCIDENT_ORCHESTRATION_SERVICE_URL || "http://localhost:4072";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerSovereigntyIncidentGatewayRoutes(app: FastifyInstance) {
  app.post("/api/sovereignty-incidents", async (request, reply) => {
    const r = await proxy("POST", "/sovereignty-incidents", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/sovereignty-incidents/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/sovereignty-incidents/${id}/status`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/sovereignty-incidents/:id/contain", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/sovereignty-incidents/${id}/contain`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/sovereignty-incidents/:id/remediate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/sovereignty-incidents/${id}/remediate`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/sovereignty-incidents/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/sovereignty-incidents/${id}/resolve`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/sovereignty-incidents/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/sovereignty-incidents/${id}/close`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/sovereignty-incidents/actions/:actionId/run", async (request, reply) => {
    const { actionId } = request.params as { actionId: string };
    const r = await proxy("POST", `/sovereignty-incidents/actions/${actionId}/run`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/sovereignty-incidents/:id/run-all-actions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/sovereignty-incidents/${id}/run-all-actions`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/sovereignty-incidents/:id/actions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/sovereignty-incidents/${id}/actions`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/sovereignty-incidents/:id/postmortem", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/sovereignty-incidents/${id}/postmortem`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/sovereignty-incidents", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/sovereignty-incidents${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/sovereignty-incidents/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/sovereignty-incidents/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/sovereignty-incidents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/sovereignty-incidents/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
}
