import type { FastifyInstance } from "fastify";

const base = () => process.env.REGULATORY_FILING_SERVICE_URL || "http://localhost:4058";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerRegulatoryRoutes(app: FastifyInstance) {
  app.post("/api/regulatory/profiles", async (request, reply) => {
    const r = await fetch(`${base()}/regulatory/profiles`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/regulatory/profiles", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/regulatory/profiles${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/regulatory/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/regulatory/profiles/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/regulatory/filings", async (request, reply) => {
    const r = await fetch(`${base()}/regulatory/filings`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/regulatory/filings/:id/file", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/regulatory/filings/${id}/file`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/regulatory/filings/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/regulatory/filings/${id}/reject`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/regulatory/filings", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/regulatory/filings${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/regulatory/filings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/regulatory/filings/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/regulatory/upcoming-deadlines", async (_req, reply) => {
    const r = await fetch(`${base()}/regulatory/upcoming-deadlines`);
    reply.code(r.status).send(await r.json());
  });
}
