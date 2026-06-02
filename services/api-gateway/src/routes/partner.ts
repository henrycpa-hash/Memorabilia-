import type { FastifyInstance } from "fastify";

const base = () => process.env.PARTNER_INTEGRATION_SERVICE_URL || "http://localhost:4030";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerPartnerIntegrationRoutes(app: FastifyInstance) {
  app.post("/api/partners", async (request, reply) => {
    const r = await fetch(`${base()}/partners`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/partners", async (_req, reply) => {
    const r = await fetch(`${base()}/partners`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/partners/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await fetch(`${base()}/partners/by-tenant/${tenantId}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/partners/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/partners/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/partners/:id/suspend", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/partners/${id}/suspend`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/partners/:id/inventory/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/partners/${id}/inventory/sync`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body || {})
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/partners/:id/inventory", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/partners/${id}/inventory`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/partners/inventory/:partnerInventoryId/map", async (request, reply) => {
    const { partnerInventoryId } = request.params as { partnerInventoryId: string };
    const r = await fetch(`${base()}/partners/inventory/${partnerInventoryId}/map`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/partners/:id/webhooks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/partners/${id}/webhooks`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/partners/:id/webhooks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/partners/${id}/webhooks`);
    reply.code(r.status).send(await r.json());
  });
}
