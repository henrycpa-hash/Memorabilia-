import type { FastifyInstance } from "fastify";

const base = () => process.env.ROYALTY_SERVICE_URL || "http://localhost:4006";

export function registerRoyaltyRoutes(app: FastifyInstance) {
  app.post("/api/royalty-rules", async (request, reply) => {
    const response = await fetch(`${base()}/rules`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/royalty-rules", async (_request, reply) => {
    const response = await fetch(`${base()}/rules`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/royalty-distributions", async (_request, reply) => {
    const response = await fetch(`${base()}/distributions`);
    reply.code(response.status).send(await response.json());
  });
}
