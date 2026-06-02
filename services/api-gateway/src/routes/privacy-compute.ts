import type { FastifyInstance } from "fastify";

const base = () => process.env.PRIVACY_ENHANCING_COMPUTE_SERVICE_URL || "http://localhost:4057";

function authHeaders(request: { headers: { authorization?: string } }) {
  return { "content-type": "application/json", authorization: request.headers.authorization || "" };
}

export function registerPrivacyComputeRoutes(app: FastifyInstance) {
  app.post("/api/privacy-compute/jobs", async (request, reply) => {
    const r = await fetch(`${base()}/privacy-compute/jobs`, { method: "POST", headers: authHeaders(request), body: JSON.stringify(request.body) });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy-compute/jobs", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/privacy-compute/jobs${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy-compute/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/privacy-compute/jobs/${id}`);
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/privacy-compute/artifacts", async (request, reply) => {
    const qs = request.url.split("?")[1] || "";
    const r = await fetch(`${base()}/privacy-compute/artifacts${qs ? "?" + qs : ""}`);
    reply.code(r.status).send(await r.json());
  });
}
