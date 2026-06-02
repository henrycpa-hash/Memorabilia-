import type { FastifyInstance } from "fastify";

const base = () => process.env.DISPUTE_SERVICE_URL || "http://localhost:4016";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerDisputeRoutes(app: FastifyInstance) {
  app.post("/api/disputes", async (request, reply) => {
    const response = await fetch(`${base()}/disputes`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/disputes", async (request, reply) => {
    const response = await fetch(`${base()}/disputes`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/disputes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/disputes/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/disputes/by-settlement/:settlementId", async (request, reply) => {
    const { settlementId } = request.params as { settlementId: string };
    const response = await fetch(`${base()}/disputes/by-settlement/${settlementId}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/disputes/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/disputes/${id}/messages`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/disputes/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/disputes/${id}/messages`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/disputes/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/disputes/${id}/resolve`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/disputes/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/disputes/${id}/close`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(response.status).send(await response.json());
  });

  // Ops mirror
  app.get("/api/ops/disputes", async (request, reply) => {
    const response = await fetch(`${base()}/disputes`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });
}
