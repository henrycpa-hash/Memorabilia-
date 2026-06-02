import type { FastifyInstance } from "fastify";

const base = () => process.env.RANKING_SERVICE_URL || "http://localhost:4013";

export function registerRankingRoutes(app: FastifyInstance) {
  app.post("/api/trending/signals", async (request, reply) => {
    const response = await fetch(`${base()}/trending/signals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/trending/assets", async (request, reply) => {
    const qs = request.url.includes("?") ? "?" + request.url.split("?")[1] : "";
    const response = await fetch(`${base()}/trending/assets${qs}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/trending/assets/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/trending/assets/${assetId}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/share-cards", async (request, reply) => {
    const response = await fetch(`${base()}/share-cards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/share-cards/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/share-cards/${assetId}`);
    reply.code(response.status).send(await response.json());
  });
}
