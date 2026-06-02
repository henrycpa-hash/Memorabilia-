import type { FastifyInstance } from "fastify";

const base = () => process.env.SSO_FEDERATION_SERVICE_URL || "http://localhost:4038";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerSsoRoutes(app: FastifyInstance) {
  app.post("/api/sso/providers", async (request, reply) => {
    const r = await fetch(`${base()}/sso/providers`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/providers", async (_req, reply) => {
    const r = await fetch(`${base()}/sso/providers`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/providers/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/sso/providers/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/providers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sso/providers/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sso/providers/:id/suspend", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sso/providers/${id}/suspend`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/resolve-domain", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sso/resolve-domain${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sso/providers/:id/role-mappings", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sso/providers/${id}/role-mappings`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/providers/:id/role-mappings", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sso/providers/${id}/role-mappings`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sso/providers/:id/scim/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sso/providers/${id}/scim/sync`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/scim/runs", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sso/scim/runs${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/sso/users", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/sso/users${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/sso/providers/:id/sessions/build", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/sso/providers/${id}/sessions/build`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
}
