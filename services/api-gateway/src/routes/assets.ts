import type { FastifyInstance } from "fastify";

const base = () => process.env.ASSET_SERVICE_URL || "http://localhost:4002";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerAssetRoutes(app: FastifyInstance) {
  // ---------- Assets ----------
  app.post("/api/assets", async (request, reply) => {
    const response = await fetch(`${base()}/assets`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/assets", async (_request, reply) => {
    const response = await fetch(`${base()}/assets`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/assets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/assets/${id}`);
    reply.code(response.status).send(await response.json());
  });

  // ---------- Evidence: Wave 1 direct + Wave 2 intent/complete ----------
  app.post("/api/evidence", async (request, reply) => {
    const response = await fetch(`${base()}/evidence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/evidence/upload-intents", async (request, reply) => {
    const response = await fetch(`${base()}/evidence/upload-intents`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/evidence/complete", async (request, reply) => {
    const response = await fetch(`${base()}/evidence/complete`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  // ---------- Listings ----------
  app.post("/api/listings", async (request, reply) => {
    const response = await fetch(`${base()}/listings`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/listings", async (_request, reply) => {
    const response = await fetch(`${base()}/listings`);
    reply.code(response.status).send(await response.json());
  });

  // ---------- Wave 2 collector vault + public ----------
  app.get("/api/vault/me", async (request, reply) => {
    const response = await fetch(`${base()}/vault/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/public/assets", async (_request, reply) => {
    const response = await fetch(`${base()}/public/assets`);
    reply.code(response.status).send(await response.json());
  });
}
