import type { FastifyInstance } from "fastify";

const base = () => process.env.ML_RISK_SERVICE_URL || "http://localhost:4025";

export function registerMlRiskRoutes(app: FastifyInstance) {
  app.post("/api/ml/features", async (request, reply) => {
    const r = await fetch(`${base()}/ml/features`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/ml/features/latest/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    const r = await fetch(`${base()}/ml/features/latest/${subjectType}/${subjectId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/ml/inference", async (request, reply) => {
    const r = await fetch(`${base()}/ml/inference`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/ml/inference/logs", async (request, reply) => {
    const r = await fetch(`${base()}/ml/inference/logs`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/ml/inference/logs/by-subject/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    const r = await fetch(`${base()}/ml/inference/logs/by-subject/${subjectType}/${subjectId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/ml/inference/logs/:id/outcome", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/ml/inference/logs/${id}/outcome`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/ml/models", async (_request, reply) => {
    const r = await fetch(`${base()}/ml/models`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/ml/models", async (request, reply) => {
    const r = await fetch(`${base()}/ml/models`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/ml/models/champion", async (_request, reply) => {
    const r = await fetch(`${base()}/ml/models/champion`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/ml/models/challenger", async (_request, reply) => {
    const r = await fetch(`${base()}/ml/models/challenger`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/ml/models/:id/promote", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/ml/models/${id}/promote`, {
      method: "POST",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });
}
