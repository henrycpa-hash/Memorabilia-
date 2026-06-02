import type { FastifyInstance } from "fastify";

const base = () => process.env.CONNECTOR_RUNTIME_SERVICE_URL || "http://localhost:4034";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerConnectorRoutes(app: FastifyInstance) {
  app.post("/api/connectors", async (request, reply) => {
    const r = await fetch(`${base()}/connectors`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/connectors", async (_req, reply) => {
    const r = await fetch(`${base()}/connectors`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/connectors/by-kind/:kind", async (request, reply) => {
    const { kind } = request.params as { kind: string };
    const r = await fetch(`${base()}/connectors/by-kind/${kind}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/connectors/health", async (_req, reply) => {
    const r = await fetch(`${base()}/connectors/health`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/connectors/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/connectors/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/connectors/:id/disable", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/connectors/${id}/disable`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/connectors/:id/invoke", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/connectors/${id}/invoke`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/connectors/:id/reset-circuit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/connectors/${id}/reset-circuit`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/connectors/:id/health", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/connectors/${id}/health`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/connectors/:id/calls", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/connectors/${id}/calls`);
    reply.code(r.status).send(await r.json());
  });
}
