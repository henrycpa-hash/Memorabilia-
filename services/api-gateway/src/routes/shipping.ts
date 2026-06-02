import type { FastifyInstance } from "fastify";

const base = () => process.env.SHIPPING_SERVICE_URL || "http://localhost:4023";

export function registerShippingRoutes(app: FastifyInstance) {
  app.post("/api/shipments", async (request, reply) => {
    const r = await fetch(`${base()}/shipments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/shipments", async (request, reply) => {
    const r = await fetch(`${base()}/shipments`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/shipments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/shipments/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/shipments/by-settlement/:settlementId", async (request, reply) => {
    const { settlementId } = request.params as { settlementId: string };
    const r = await fetch(`${base()}/shipments/by-settlement/${settlementId}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/shipments/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/shipments/${id}/events`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/shipments/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/shipments/${id}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
}
