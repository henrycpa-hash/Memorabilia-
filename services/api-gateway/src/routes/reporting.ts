import type { FastifyInstance } from "fastify";

const base = () => process.env.REPORTING_SERVICE_URL || "http://localhost:4028";

export function registerReportingRoutes(app: FastifyInstance) {
  app.post("/api/reports", async (request, reply) => {
    const r = await fetch(`${base()}/reports`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/reports", async (request, reply) => {
    const r = await fetch(`${base()}/reports`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/reports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/reports/${id}`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });
}
