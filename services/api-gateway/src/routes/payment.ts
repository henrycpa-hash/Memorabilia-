import type { FastifyInstance } from "fastify";

const base = () => process.env.PAYMENT_SERVICE_URL || "http://localhost:4022";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerPaymentRoutes(app: FastifyInstance) {
  app.post("/api/payments/intents", async (request, reply) => {
    const r = await fetch(`${base()}/payments/intents`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/payments/intents", async (request, reply) => {
    const r = await fetch(`${base()}/payments/intents`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/payments/intents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/payments/intents/${id}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/payments/intents/by-settlement/:settlementId", async (request, reply) => {
    const { settlementId } = request.params as { settlementId: string };
    const r = await fetch(`${base()}/payments/intents/by-settlement/${settlementId}`);
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/payments/intents/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/payments/intents/${id}/events`);
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/payments/intents/:id/capture", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/payments/intents/${id}/capture`, { method: "POST" });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/payments/intents/:id/refund", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/payments/intents/${id}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body || {})
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/payments/intents/:id/void", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/payments/intents/${id}/void`, { method: "POST" });
    reply.code(r.status).send(await r.json());
  });

  // Payouts (Wave 5 v2 — separate from Wave 3 ledger payouts)
  app.post("/api/payments/payouts", async (request, reply) => {
    const r = await fetch(`${base()}/payments/payouts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/payments/payouts", async (request, reply) => {
    const r = await fetch(`${base()}/payments/payouts`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/payments/payouts/:id/mark-paid", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/payments/payouts/${id}/mark-paid`, { method: "POST" });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/payments/payouts/by-settlement/:settlementId", async (request, reply) => {
    const { settlementId } = request.params as { settlementId: string };
    const r = await fetch(`${base()}/payments/payouts/by-settlement/${settlementId}`);
    reply.code(r.status).send(await r.json());
  });
}
