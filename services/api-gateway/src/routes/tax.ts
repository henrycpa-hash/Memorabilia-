import type { FastifyInstance } from "fastify";

const base = () => process.env.TAX_LOCALIZATION_SERVICE_URL || "http://localhost:4054";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerTaxRoutes(app: FastifyInstance) {
  app.post("/api/tax/jurisdictions", async (request, reply) => {
    const r = await fetch(`${base()}/tax/jurisdictions`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/tax/jurisdictions/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tax/jurisdictions/${id}/archive`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/jurisdictions", async (_req, reply) => {
    const r = await fetch(`${base()}/tax/jurisdictions`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/jurisdictions/by-country/:country", async (request, reply) => {
    const { country } = request.params as { country: string };
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/tax/jurisdictions/by-country/${country}${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/jurisdictions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tax/jurisdictions/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/tax/determinations", async (request, reply) => {
    const r = await fetch(`${base()}/tax/determinations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/determinations", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/tax/determinations${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/determinations/by-reference/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const r = await fetch(`${base()}/tax/determinations/by-reference/${type}/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/tax/withholding/compute", async (request, reply) => {
    const r = await fetch(`${base()}/tax/withholding/compute`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/tax/profiles", async (request, reply) => {
    const r = await fetch(`${base()}/tax/profiles`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/profiles", async (_req, reply) => {
    const r = await fetch(`${base()}/tax/profiles`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tax/profiles/by-scope/:scopeType/:scopeId", async (request, reply) => {
    const { scopeType, scopeId } = request.params as { scopeType: string; scopeId: string };
    const r = await fetch(`${base()}/tax/profiles/by-scope/${scopeType}/${scopeId}`);
    reply.code(r.status).send(await r.json());
  });
}
