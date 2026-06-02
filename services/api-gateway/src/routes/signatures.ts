import type { FastifyInstance } from "fastify";

const base = () => process.env.SIGNATURE_INTEGRATION_SERVICE_URL || "http://localhost:4047";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerSignatureRoutes(app: FastifyInstance) {
  app.post("/api/signatures/envelopes", async (request, reply) => {
    const r = await fetch(`${base()}/signatures/envelopes`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/signatures/envelopes/:id/send", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/signatures/envelopes/${id}/send`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/signatures/envelopes/:id/callbacks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/signatures/envelopes/${id}/callbacks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/signatures/envelopes/:id/void", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/signatures/envelopes/${id}/void`, { method: "POST", headers: authHeaders(request) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/signatures/envelopes", async (_req, reply) => {
    const r = await fetch(`${base()}/signatures/envelopes`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/signatures/envelopes/by-agreement/:agreementId", async (request, reply) => {
    const { agreementId } = request.params as { agreementId: string };
    const r = await fetch(`${base()}/signatures/envelopes/by-agreement/${agreementId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/signatures/envelopes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/signatures/envelopes/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/signatures/envelopes/:id/signers", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/signatures/envelopes/${id}/signers`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/signatures/envelopes/:id/callbacks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/signatures/envelopes/${id}/callbacks`);
    reply.code(r.status).send(await r.json());
  });
}
