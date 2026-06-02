import type { FastifyInstance } from "fastify";

const base = () => process.env.INSURANCE_SERVICE_URL || "http://localhost:4024";

export function registerInsuranceRoutes(app: FastifyInstance) {
  app.post("/api/insurance/policies", async (request, reply) => {
    const r = await fetch(`${base()}/insurance/policies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/policies", async (request, reply) => {
    const r = await fetch(`${base()}/insurance/policies`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/insurance/policies/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/policies/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const r = await fetch(`${base()}/insurance/policies/by-asset/${assetId}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/policies/by-shipment/:shipmentId", async (request, reply) => {
    const { shipmentId } = request.params as { shipmentId: string };
    const r = await fetch(`${base()}/insurance/policies/by-shipment/${shipmentId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/insurance/claims", async (request, reply) => {
    const r = await fetch(`${base()}/insurance/claims`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/claims", async (request, reply) => {
    const r = await fetch(`${base()}/insurance/claims`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/claims/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/insurance/claims/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/claims/by-settlement/:settlementId", async (request, reply) => {
    const { settlementId } = request.params as { settlementId: string };
    const r = await fetch(`${base()}/insurance/claims/by-settlement/${settlementId}`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/insurance/claims/:id/evidence", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/insurance/claims/${id}/evidence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/insurance/claims/:id/evidence", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/insurance/claims/${id}/evidence`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/insurance/claims/:id/resolve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/insurance/claims/${id}/resolve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
}
