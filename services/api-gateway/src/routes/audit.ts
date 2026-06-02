import type { FastifyInstance } from "fastify";

const base = () => process.env.AUDIT_SERVICE_URL || "http://localhost:4014";

export function registerAuditRoutes(app: FastifyInstance) {
  app.post("/api/audit", async (request, reply) => {
    const response = await fetch(`${base()}/audit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/audit", async (request, reply) => {
    const response = await fetch(`${base()}/audit`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/audit/by-aggregate/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const response = await fetch(`${base()}/audit/by-aggregate/${type}/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/audit/by-actor/:actorId", async (request, reply) => {
    const { actorId } = request.params as { actorId: string };
    const response = await fetch(`${base()}/audit/by-actor/${actorId}`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/audit/count", async (_request, reply) => {
    const response = await fetch(`${base()}/audit/count`);
    reply.code(response.status).send(await response.json());
  });
}
