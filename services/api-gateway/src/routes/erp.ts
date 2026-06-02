import type { FastifyInstance } from "fastify";

const base = () => process.env.ERP_GL_CONNECTOR_SERVICE_URL || "http://localhost:4040";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerErpRoutes(app: FastifyInstance) {
  app.post("/api/erp/profiles", async (request, reply) => {
    const r = await fetch(`${base()}/erp/profiles`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/erp/profiles", async (_req, reply) => {
    const r = await fetch(`${base()}/erp/profiles`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/erp/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/erp/profiles/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/erp/profiles/:id/exports", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/erp/profiles/${id}/exports`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/erp/profiles/:id/exports", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/erp/profiles/${id}/exports`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/erp/exports", async (request, reply) => {
    const r = await fetch(`${base()}/erp/exports`, { headers: { authorization: request.headers.authorization || "" } });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/erp/exports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/erp/exports/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/erp/exports/:id/ack", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/erp/exports/${id}/ack`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/erp/exports/:id/acks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/erp/exports/${id}/acks`);
    reply.code(r.status).send(await r.json());
  });
}
