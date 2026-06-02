import type { FastifyInstance } from "fastify";

const base = () => process.env.REFERRAL_SERVICE_URL || "http://localhost:4007";

export function registerReferralRoutes(app: FastifyInstance) {
  app.post("/api/referrals", async (request, reply) => {
    const response = await fetch(`${base()}/referrals`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body || {})
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/referrals/me", async (request, reply) => {
    const response = await fetch(`${base()}/referrals/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/referrals/convert", async (request, reply) => {
    const response = await fetch(`${base()}/referrals/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/referrals", async (_request, reply) => {
    const response = await fetch(`${base()}/referrals`);
    reply.code(response.status).send(await response.json());
  });
}
