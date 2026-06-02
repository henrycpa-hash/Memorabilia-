import type { FastifyInstance } from "fastify";

const base = () => process.env.TENANCY_SERVICE_URL || "http://localhost:4031";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerTenancyRoutes(app: FastifyInstance) {
  app.post("/api/tenants", async (request, reply) => {
    const r = await fetch(`${base()}/tenants`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tenants", async (_req, reply) => {
    const r = await fetch(`${base()}/tenants`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tenants/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tenants/by-slug/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const r = await fetch(`${base()}/tenants/by-slug/${slug}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/tenants/:id/branding", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}/branding`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/tenants/:id/settings", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}/settings`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/tenants/:id/flags", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}/flags`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tenants/:id/flags", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}/flags`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/tenants/:id/policies", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}/policies`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/tenants/:id/policies", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/tenants/${id}/policies`);
    reply.code(r.status).send(await r.json());
  });
}
