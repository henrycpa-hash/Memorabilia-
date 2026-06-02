import type { FastifyInstance } from "fastify";

const base = () => process.env.DRIVER_FORECAST_MODEL_SERVICE_URL || "http://localhost:4070";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerForecastDriversGatewayRoutes(app: FastifyInstance) {
  app.post("/api/forecast-drivers/drivers", async (request, reply) => {
    const r = await proxy("POST", "/forecast-drivers/drivers", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/forecast-drivers/drivers", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/forecast-drivers/drivers${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/forecast-drivers/drivers/by-key/:k", async (request, reply) => {
    const { k } = request.params as { k: string };
    const r = await proxy("GET", `/forecast-drivers/drivers/by-key/${k}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/forecast-drivers/runs", async (request, reply) => {
    const r = await proxy("POST", "/forecast-drivers/runs", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/forecast-drivers/runs", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/forecast-drivers/runs${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/forecast-drivers/runs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/forecast-drivers/runs/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/forecast-drivers/sensitivities", async (request, reply) => {
    const r = await proxy("POST", "/forecast-drivers/sensitivities", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/forecast-drivers/runs/:id/sensitivities", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/forecast-drivers/runs/${id}/sensitivities`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/forecast-drivers/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/forecast-drivers/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
}
