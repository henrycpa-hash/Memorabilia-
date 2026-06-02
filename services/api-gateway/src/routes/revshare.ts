import type { FastifyInstance } from "fastify";

const base = () => process.env.REVENUE_SHARE_SERVICE_URL || "http://localhost:4048";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerRevShareRoutes(app: FastifyInstance) {
  app.post("/api/revshare/trees", async (request, reply) => {
    const r = await fetch(`${base()}/revshare/trees`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/revshare/trees/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/revshare/trees/${id}/archive`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/trees", async (_req, reply) => {
    const r = await fetch(`${base()}/revshare/trees`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/trees/by-scope/:scopeType/:scopeId", async (request, reply) => {
    const { scopeType, scopeId } = request.params as { scopeType: string; scopeId: string };
    const r = await fetch(`${base()}/revshare/trees/by-scope/${scopeType}/${scopeId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/trees/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/revshare/trees/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/revshare/calculate", async (request, reply) => {
    const r = await fetch(`${base()}/revshare/calculate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/calculations", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/revshare/calculations${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/calculations/by-reference/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const r = await fetch(`${base()}/revshare/calculations/by-reference/${type}/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/calculations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/revshare/calculations/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/revshare/partner-statements", async (request, reply) => {
    const r = await fetch(`${base()}/revshare/partner-statements`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/partner-statements", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/revshare/partner-statements${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/revshare/partner-statements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/revshare/partner-statements/${id}`);
    reply.code(r.status).send(await r.json());
  });
}
