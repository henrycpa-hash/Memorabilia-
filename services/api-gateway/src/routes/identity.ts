import type { FastifyInstance } from "fastify";

const base = () => process.env.IDENTITY_SERVICE_URL || "http://localhost:4001";

export function registerIdentityRoutes(app: FastifyInstance) {
  // ---------- Wave 1 admin-style user create (no password) ----------
  app.post("/api/users", async (request, reply) => {
    const response = await fetch(`${base()}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/users", async (request, reply) => {
    const response = await fetch(`${base()}/users`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  // ---------- Wave 2 register / login (returns JWT) ----------
  app.post("/api/register", async (request, reply) => {
    const response = await fetch(`${base()}/users/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/login", async (request, reply) => {
    const response = await fetch(`${base()}/users/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  // ---------- Creator profiles ----------
  app.post("/api/creators", async (request, reply) => {
    const response = await fetch(`${base()}/creators`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/creators", async (_request, reply) => {
    const response = await fetch(`${base()}/creators`);
    reply.code(response.status).send(await response.json());
  });
}
