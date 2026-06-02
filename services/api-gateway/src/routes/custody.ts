import type { FastifyInstance } from "fastify";

const base = () => process.env.SOVEREIGN_KEY_CUSTODY_SERVICE_URL || "http://localhost:4060";

async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: request.headers.authorization || ""
    },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerCustodyGatewayRoutes(app: FastifyInstance) {
  app.post("/api/custody/profiles", async (request, reply) => {
    const r = await proxy("POST", "/custody/profiles", request as never);
    reply.code(r.status).send(r.body);
  });
  app.put("/api/custody/profiles/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("PUT", `/custody/profiles/${id}/status`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/custody/profiles", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/custody/profiles${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/custody/profiles/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const r = await proxy("GET", `/custody/profiles/by-tenant/${tenantId}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/custody/keys", async (request, reply) => {
    const r = await proxy("POST", "/custody/keys", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/custody/keys/:id/rotate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/custody/keys/${id}/rotate`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/custody/keys/:id/revoke", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/custody/keys/${id}/revoke`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/custody/keys", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/custody/keys${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/custody/sign", async (request, reply) => {
    const r = await proxy("POST", "/custody/sign", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/custody/signing-events", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/custody/signing-events${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/custody/attestations", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/custody/attestations${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/custody/attestations/by-reference/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const r = await proxy("GET", `/custody/attestations/by-reference/${type}/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
}
