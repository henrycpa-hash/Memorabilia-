import type { FastifyInstance } from "fastify";

const base = () => process.env.SOVEREIGN_ATTESTATION_EXPORT_SERVICE_URL || "http://localhost:4066";
async function proxy(method: string, path: string, request: { body: unknown; headers: { authorization?: string } }) {
  const r = await fetch(`${base()}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: request.headers.authorization || "" },
    body: method === "GET" ? undefined : JSON.stringify(request.body)
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export function registerAttestationGatewayRoutes(app: FastifyInstance) {
  app.post("/api/attestation/packets", async (request, reply) => {
    const r = await proxy("POST", "/attestation/packets", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/attestation/packets/:id/sign", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/attestation/packets/${id}/sign`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/attestation/packets/:id/revoke", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/attestation/packets/${id}/revoke`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/attestation/packets/:id/verify", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/attestation/packets/${id}/verify`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/attestation/packets", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/attestation/packets${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/attestation/packets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("GET", `/attestation/packets/${id}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/attestation/exports", async (request, reply) => {
    const r = await proxy("POST", "/attestation/exports", request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/attestation/exports/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/attestation/exports/${id}/approve`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.post("/api/attestation/exports/:id/deny", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await proxy("POST", `/attestation/exports/${id}/deny`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/attestation/exports", async (request, reply) => {
    const qs = new URLSearchParams(request.query as Record<string, string>).toString();
    const r = await proxy("GET", `/attestation/exports${qs ? `?${qs}` : ""}`, request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/attestation/exports/pending", async (request, reply) => {
    const r = await proxy("GET", "/attestation/exports/pending", request as never);
    reply.code(r.status).send(r.body);
  });
  app.get("/api/attestation/pipeline-summary", async (request, reply) => {
    const r = await proxy("GET", "/attestation/pipeline-summary", request as never);
    reply.code(r.status).send(r.body);
  });
}
