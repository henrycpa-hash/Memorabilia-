import type { FastifyInstance } from "fastify";

const base = () => process.env.CRM_SERVICE_URL || "http://localhost:4027";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerCrmRoutes(app: FastifyInstance) {
  app.post("/api/crm/segments", async (request, reply) => {
    const r = await fetch(`${base()}/crm/segments`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/segments", async (_request, reply) => {
    const r = await fetch(`${base()}/crm/segments`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/segments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/crm/segments/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/segments/by-creator/:creatorId", async (request, reply) => {
    const { creatorId } = request.params as { creatorId: string };
    const r = await fetch(`${base()}/crm/segments/by-creator/${creatorId}`);
    reply.code(r.status).send(await r.json());
  });

  app.delete("/api/crm/segments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/crm/segments/${id}`, {
      method: "DELETE",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/crm/segments/:id/materialize", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/crm/segments/${id}/materialize`, { method: "POST" });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/segments/:id/latest-materialization", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/crm/segments/${id}/latest-materialization`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/crm/profiles", async (request, reply) => {
    const r = await fetch(`${base()}/crm/profiles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/profiles", async (_request, reply) => {
    const r = await fetch(`${base()}/crm/profiles`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/profiles/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const r = await fetch(`${base()}/crm/profiles/${userId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/crm/journeys", async (request, reply) => {
    const r = await fetch(`${base()}/crm/journeys`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/journeys", async (_request, reply) => {
    const r = await fetch(`${base()}/crm/journeys`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/crm/journeys/by-creator/:creatorId", async (request, reply) => {
    const { creatorId } = request.params as { creatorId: string };
    const r = await fetch(`${base()}/crm/journeys/by-creator/${creatorId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/crm/journeys/:id/toggle", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/crm/journeys/${id}/toggle`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
}
