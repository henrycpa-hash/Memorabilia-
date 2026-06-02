import type { FastifyInstance } from "fastify";

const base = () => process.env.EXPERIMENT_SERVICE_URL || "http://localhost:4026";

export function registerExperimentRoutes(app: FastifyInstance) {
  app.post("/api/experiments", async (request, reply) => {
    const r = await fetch(`${base()}/experiments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/experiments", async (_request, reply) => {
    const r = await fetch(`${base()}/experiments`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/experiments/running", async (_request, reply) => {
    const r = await fetch(`${base()}/experiments/running`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/experiments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/experiments/:id/start", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}/start`, {
      method: "POST",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/experiments/:id/pause", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}/pause`, {
      method: "POST",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/experiments/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}/complete`, {
      method: "POST",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/experiments/:id/expose", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}/expose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/experiments/:id/convert", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/experiments/:id/results", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/experiments/${id}/results`);
    reply.code(r.status).send(await r.json());
  });
}
