import type { FastifyInstance } from "fastify";

const base = () => process.env.SOCIAL_PUBLISHING_SERVICE_URL || "http://localhost:4029";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerSocialPublishingRoutes(app: FastifyInstance) {
  app.post("/api/social/posts", async (request, reply) => {
    const r = await fetch(`${base()}/social/posts`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/social/posts", async (_request, reply) => {
    const r = await fetch(`${base()}/social/posts`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/social/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/social/posts/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/social/posts/by-creator/:creatorId", async (request, reply) => {
    const { creatorId } = request.params as { creatorId: string };
    const r = await fetch(`${base()}/social/posts/by-creator/${creatorId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/social/posts/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/social/posts/${id}/approve`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/social/posts/:id/schedule", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/social/posts/${id}/schedule`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/social/posts/:id/publish-now", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/social/posts/${id}/publish-now`, {
      method: "POST",
      headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/social/workers/tick", async (_request, reply) => {
    const r = await fetch(`${base()}/workers/social/tick`, { method: "POST" });
    reply.code(r.status).send(await r.json());
  });
}
