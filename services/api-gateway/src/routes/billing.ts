import type { FastifyInstance } from "fastify";

const base = () => process.env.BILLING_METERING_SERVICE_URL || "http://localhost:4039";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerBillingRoutes(app: FastifyInstance) {
  app.post("/api/billing/plans", async (request, reply) => {
    const r = await fetch(`${base()}/billing/plans`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/plans", async (_req, reply) => {
    const r = await fetch(`${base()}/billing/plans`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/plans/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/billing/plans/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/plans/by-key/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const r = await fetch(`${base()}/billing/plans/by-key/${key}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/billing/subscriptions", async (request, reply) => {
    const r = await fetch(`${base()}/billing/subscriptions`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/subscriptions", async (_req, reply) => {
    const r = await fetch(`${base()}/billing/subscriptions`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/subscriptions/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/billing/subscriptions/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/subscriptions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/billing/subscriptions/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/billing/usage", async (request, reply) => {
    const r = await fetch(`${base()}/billing/usage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/usage/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/billing/usage/by-tenant/${tenantId}${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/billing/subscriptions/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/billing/subscriptions/${id}/close`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/statements", async (request, reply) => {
    const r = await fetch(`${base()}/billing/statements`, { headers: { authorization: request.headers.authorization || "" } });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/statements/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/billing/statements/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/billing/entitlements/:tenantId/:feature", async (request, reply) => {
    const { tenantId, feature } = request.params as { tenantId: string; feature: string };
    const r = await fetch(`${base()}/billing/entitlements/${tenantId}/${feature}`);
    reply.code(r.status).send(await r.json());
  });
}
