import type { FastifyInstance } from "fastify";

const base = () => process.env.COA_SERVICE_URL || "http://localhost:4004";

export function registerCoaRoutes(app: FastifyInstance) {
  app.post("/api/coa/issue", async (request, reply) => {
    const response = await fetch(`${base()}/coa/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/coa", async (_request, reply) => {
    const response = await fetch(`${base()}/coa`);
    reply.code(response.status).send(await response.json());
  });
}
