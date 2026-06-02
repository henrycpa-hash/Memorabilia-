import type { FastifyInstance } from "fastify";

const base = () => process.env.CAMPAIGN_SERVICE_URL || "http://localhost:4018";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerCampaignRoutes(app: FastifyInstance) {
  app.post("/api/campaigns", async (request, reply) => {
    const response = await fetch(`${base()}/campaigns`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/campaigns", async (_request, reply) => {
    const response = await fetch(`${base()}/campaigns`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/campaigns/live", async (_request, reply) => {
    const response = await fetch(`${base()}/campaigns/live`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/campaigns/by-creator/:creatorId", async (request, reply) => {
    const { creatorId } = request.params as { creatorId: string };
    const response = await fetch(`${base()}/campaigns/by-creator/${creatorId}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/campaigns/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/campaigns/:id/launch", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/campaigns/${id}/launch`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/campaigns/:id/end", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/campaigns/${id}/end`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/campaigns/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/campaigns/${id}/events`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/campaigns/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/campaigns/${id}/events`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/campaigns/:id/metrics", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/campaigns/${id}/metrics`);
    reply.code(response.status).send(await response.json());
  });
}
