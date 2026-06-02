import type { FastifyInstance } from "fastify";

const base = () => process.env.REDLINING_NEGOTIATION_SERVICE_URL || "http://localhost:4055";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerRedliningRoutes(app: FastifyInstance) {
  app.post("/api/redlines/versions", async (request, reply) => {
    const r = await fetch(`${base()}/redlines/versions`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/redlines/versions/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/redlines/versions/${id}/status`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/versions", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/redlines/versions${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/versions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/redlines/versions/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/redlines/diffs", async (request, reply) => {
    const r = await fetch(`${base()}/redlines/diffs`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/redlines/diffs/:id/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/redlines/diffs/${id}/review`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/diffs", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/redlines/diffs${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/diffs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/redlines/diffs/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/redlines/issues", async (request, reply) => {
    const r = await fetch(`${base()}/redlines/issues`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/redlines/issues/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/redlines/issues/${id}/resolve`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/issues", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/redlines/issues${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/issues/open", async (_req, reply) => {
    const r = await fetch(`${base()}/redlines/issues/open`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/redlines/clauses", async (request, reply) => {
    const r = await fetch(`${base()}/redlines/clauses`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/clauses", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/redlines/clauses${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/redlines/clauses/:clauseKey/fallback/:rank", async (request, reply) => {
    const { clauseKey, rank } = request.params as { clauseKey: string; rank: string };
    const r = await fetch(`${base()}/redlines/clauses/${clauseKey}/fallback/${rank}`);
    reply.code(r.status).send(await r.json());
  });
}
