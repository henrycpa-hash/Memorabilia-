import type { FastifyInstance } from "fastify";

const base = () => process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerSettlementRoutes(app: FastifyInstance) {
  app.post("/api/settlements", async (request, reply) => {
    const response = await fetch(`${base()}/settlements`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/settlements", async (request, reply) => {
    const response = await fetch(`${base()}/settlements`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/settlements/me", async (request, reply) => {
    const response = await fetch(`${base()}/settlements/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/settlements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/settlements/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/settlements/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/settlements/${id}/events`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/settlements/by-state/:state", async (request, reply) => {
    const { state } = request.params as { state: string };
    const response = await fetch(`${base()}/settlements/by-state/${state}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/settlements/:id/hold", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/settlements/${id}/hold`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/settlements/:id/release", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/settlements/${id}/release`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/settlements/:id/refund", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/settlements/${id}/refund`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  // Ops console reads
  app.get("/api/ops/settlements", async (request, reply) => {
    const response = await fetch(`${base()}/settlements`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });
}
