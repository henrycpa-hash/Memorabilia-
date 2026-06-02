import type { FastifyInstance } from "fastify";

const base = () => process.env.LEGAL_PACKET_SERVICE_URL || "http://localhost:4042";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerLegalPacketRoutes(app: FastifyInstance) {
  app.post("/api/legal-packets", async (request, reply) => {
    const r = await fetch(`${base()}/legal-packets`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-packets/:id/assemble", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-packets/${id}/assemble`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/legal-packets/:id/mark-delivered", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-packets/${id}/mark-delivered`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-packets", async (_req, reply) => {
    const r = await fetch(`${base()}/legal-packets`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-packets/by-type/:type", async (request, reply) => {
    const { type } = request.params as { type: string };
    const r = await fetch(`${base()}/legal-packets/by-type/${type}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-packets/by-subject/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    const r = await fetch(`${base()}/legal-packets/by-subject/${subjectType}/${subjectId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/legal-packets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/legal-packets/${id}`);
    reply.code(r.status).send(await r.json());
  });
}
