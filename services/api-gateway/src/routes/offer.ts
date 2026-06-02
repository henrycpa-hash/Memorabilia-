import type { FastifyInstance } from "fastify";

const base = () => process.env.OFFER_SERVICE_URL || "http://localhost:4010";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerOfferRoutes(app: FastifyInstance) {
  app.post("/api/offers", async (request, reply) => {
    const response = await fetch(`${base()}/offers`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/offers", async (_request, reply) => {
    const response = await fetch(`${base()}/offers`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/offers/me", async (request, reply) => {
    const response = await fetch(`${base()}/offers/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/offers/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/offers/by-asset/${assetId}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/offers/count-accepted/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/offers/count-accepted/${assetId}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/offers/:id/counter", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/offers/${id}/counter`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/offers/:id/accept", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/offers/${id}/accept`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body || {})
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/offers/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/offers/${id}/reject`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body || {})
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/offers/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/offers/${id}/events`);
    reply.code(response.status).send(await response.json());
  });
}
