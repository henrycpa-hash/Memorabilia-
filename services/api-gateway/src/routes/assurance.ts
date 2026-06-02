import type { FastifyInstance } from "fastify";

const base = () => process.env.REVENUE_ASSURANCE_SERVICE_URL || "http://localhost:4056";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerAssuranceRoutes(app: FastifyInstance) {
  app.post("/api/assurance/audits", async (request, reply) => {
    const r = await fetch(`${base()}/assurance/audits`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/assurance/audits", async (_req, reply) => {
    const r = await fetch(`${base()}/assurance/audits`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/assurance/audits/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/assurance/audits/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/assurance/audits/:id/variances", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/assurance/audits/${id}/variances`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/assurance/variances", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/assurance/variances${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/assurance/pipeline-summary", async (_req, reply) => {
    const r = await fetch(`${base()}/assurance/pipeline-summary`);
    reply.code(r.status).send(await r.json());
  });
}
