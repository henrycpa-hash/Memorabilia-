import type { FastifyInstance } from "fastify";

const base = () => process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4020";

export function registerWarehouseRoutes(app: FastifyInstance) {
  app.post("/api/warehouse/facts", async (request, reply) => {
    const response = await fetch(`${base()}/warehouse/facts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/warehouse/facts", async (request, reply) => {
    const qs = request.url.includes("?") ? "?" + request.url.split("?")[1] : "";
    const response = await fetch(`${base()}/warehouse/facts${qs}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/warehouse/metrics", async (_request, reply) => {
    const response = await fetch(`${base()}/warehouse/metrics`);
    reply.code(response.status).send(await response.json());
  });
}
