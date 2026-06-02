import type { FastifyInstance } from "fastify";

const base = () => process.env.POLICY_SANDBOX_SERVICE_URL || "http://localhost:4043";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerPolicySandboxRoutes(app: FastifyInstance) {
  app.post("/api/policy-sandbox/simulations", async (request, reply) => {
    const r = await fetch(`${base()}/policy-sandbox/simulations`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/policy-sandbox/simulate-by-type", async (request, reply) => {
    const r = await fetch(`${base()}/policy-sandbox/simulate-by-type`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policy-sandbox/simulations", async (_req, reply) => {
    const r = await fetch(`${base()}/policy-sandbox/simulations`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policy-sandbox/simulations/by-pack/:packId", async (request, reply) => {
    const { packId } = request.params as { packId: string };
    const r = await fetch(`${base()}/policy-sandbox/simulations/by-pack/${packId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policy-sandbox/simulations/by-subject/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    const r = await fetch(`${base()}/policy-sandbox/simulations/by-subject/${subjectType}/${subjectId}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/policy-sandbox/simulations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/policy-sandbox/simulations/${id}`);
    reply.code(r.status).send(await r.json());
  });
}
