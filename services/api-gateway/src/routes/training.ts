import type { FastifyInstance } from "fastify";

const base = () => process.env.MODEL_TRAINING_SERVICE_URL || "http://localhost:4035";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerTrainingRoutes(app: FastifyInstance) {
  app.post("/api/training/labels", async (request, reply) => {
    const r = await fetch(`${base()}/training/labels`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/training/labels", async (_req, reply) => {
    const r = await fetch(`${base()}/training/labels`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/training/labels/mix", async (_req, reply) => {
    const r = await fetch(`${base()}/training/labels/mix`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/training/datasets", async (request, reply) => {
    const r = await fetch(`${base()}/training/datasets`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/training/datasets", async (_req, reply) => {
    const r = await fetch(`${base()}/training/datasets`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/training/jobs", async (request, reply) => {
    const r = await fetch(`${base()}/training/jobs`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/training/jobs/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/training/jobs/${id}/complete`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/training/jobs", async (_req, reply) => {
    const r = await fetch(`${base()}/training/jobs`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/training/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/training/jobs/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/training/candidates", async (_req, reply) => {
    const r = await fetch(`${base()}/training/candidates`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/training/candidates/:id/promote", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/training/candidates/${id}/promote`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/training/candidates/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/training/candidates/${id}/reject`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });
}
