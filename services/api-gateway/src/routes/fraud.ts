import type { FastifyInstance } from "fastify";

const base = () => process.env.FRAUD_SERVICE_URL || "http://localhost:4017";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerFraudRoutes(app: FastifyInstance) {
  app.post("/api/fraud/scores", async (request, reply) => {
    const response = await fetch(`${base()}/fraud/scores`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/fraud/scores", async (request, reply) => {
    const response = await fetch(`${base()}/fraud/scores`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/fraud/scores/by-subject/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const response = await fetch(`${base()}/fraud/scores/by-subject/${type}/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/fraud/scores/latest/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const response = await fetch(`${base()}/fraud/scores/latest/${type}/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/fraud/alerts", async (request, reply) => {
    const response = await fetch(`${base()}/fraud/alerts`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/fraud/alerts/:id/acknowledge", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/fraud/alerts/${id}/acknowledge`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/fraud/alerts/:id/dismiss", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/fraud/alerts/${id}/dismiss`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(response.status).send(await response.json());
  });

  // Reputation
  app.post("/api/reputation/users/recompute", async (request, reply) => {
    const response = await fetch(`${base()}/reputation/users/recompute`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/reputation/users/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const response = await fetch(`${base()}/reputation/users/${userId}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/reputation/creators/recompute", async (request, reply) => {
    const response = await fetch(`${base()}/reputation/creators/recompute`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/reputation/creators/:creatorId", async (request, reply) => {
    const { creatorId } = request.params as { creatorId: string };
    const response = await fetch(`${base()}/reputation/creators/${creatorId}`);
    reply.code(response.status).send(await response.json());
  });
}
