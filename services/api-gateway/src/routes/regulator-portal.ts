import type { FastifyInstance } from "fastify";

const base = () => process.env.REGULATOR_PORTAL_CONNECTOR_SERVICE_URL || "http://localhost:4069";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerRegulatorPortalGatewayRoutes(app: FastifyInstance) {
  app.post("/api/regulator-portals", async (request, reply) => {
    const r = await proxy("POST", "/regulator-portals", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-portals", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-portals${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-portals/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/regulator-portals/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-portals/refs", async (request, reply) => {
    const r = await proxy("POST", "/regulator-portals/refs", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-portals/refs", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-portals/refs${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-portals/refs/by-external/:ref", async (request, reply) => {
    const { ref } = request.params as { ref: string };
    const r = await proxy("GET", `/regulator-portals/refs/by-external/${ref}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-portals/refs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/regulator-portals/refs/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-portals/inbound", async (request, reply) => {
    const r = await proxy("POST", "/regulator-portals/inbound", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/regulator-portals/inbound/:id/response-pack", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/regulator-portals/inbound/${id}/response-pack`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/regulator-portals/inbound", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/regulator-portals/inbound${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
}
