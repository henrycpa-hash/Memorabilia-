import type { FastifyInstance } from "fastify";

const base = () => process.env.SEMANTIC_METRICS_SERVICE_URL || "http://localhost:4036";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerMetricsRoutes(app: FastifyInstance) {
  app.get("/api/metrics", async (_req, reply) => {
    const r = await fetch(`${base()}/metrics`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/metrics/defaults", async (_req, reply) => {
    const r = await fetch(`${base()}/metrics/defaults`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/metrics/evaluate-all", async (request, reply) => {
    const qs = (request.url.split("?")[1] || "");
    const r = await fetch(`${base()}/metrics/evaluate-all${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/metrics/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const r = await fetch(`${base()}/metrics/${key}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/metrics/custom", async (request, reply) => {
    const r = await fetch(`${base()}/metrics/custom`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/metrics/:key/evaluate", async (request, reply) => {
    const { key } = request.params as { key: string };
    const r = await fetch(`${base()}/metrics/${key}/evaluate`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body || {})
    });
    reply.code(r.status).send(await r.json());
  });
}
