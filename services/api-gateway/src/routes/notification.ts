import type { FastifyInstance } from "fastify";

const base = () =>
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008";

export function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/api/notifications/me", async (request, reply) => {
    const response = await fetch(`${base()}/notifications/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/notifications/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/notifications/${id}/read`, {
      method: "POST",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  // Internal-style: any caller can post a notification in Wave 2.
  app.post("/api/notifications", async (request, reply) => {
    const response = await fetch(`${base()}/notifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });
}
