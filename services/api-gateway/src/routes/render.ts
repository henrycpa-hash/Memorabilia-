import type { FastifyInstance } from "fastify";

const base = () => process.env.RENDER_SERVICE_URL || "http://localhost:4019";

export function registerRenderRoutes(app: FastifyInstance) {
  app.post("/api/render/jobs", async (request, reply) => {
    const response = await fetch(`${base()}/render/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/render/jobs", async (_request, reply) => {
    const response = await fetch(`${base()}/render/jobs`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/render/jobs/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/render/jobs/by-asset/${assetId}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/render/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/render/jobs/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/render/workers/tick", async (_request, reply) => {
    const response = await fetch(`${base()}/workers/render/tick`, {
      method: "POST"
    });
    reply.code(response.status).send(await response.json());
  });
}
