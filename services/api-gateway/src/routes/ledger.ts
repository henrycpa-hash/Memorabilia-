import type { FastifyInstance } from "fastify";

const base = () => process.env.LEDGER_SERVICE_URL || "http://localhost:4012";

export function registerLedgerRoutes(app: FastifyInstance) {
  app.post("/api/ledger/entries", async (request, reply) => {
    const response = await fetch(`${base()}/ledger/entries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/ledger/entries", async (_request, reply) => {
    const response = await fetch(`${base()}/ledger/entries`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/ledger/entries/by-reference/:type/:id", async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const response = await fetch(`${base()}/ledger/entries/by-reference/${type}/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/ledger/balance/:accountId", async (request, reply) => {
    const { accountId } = request.params as { accountId: string };
    const response = await fetch(`${base()}/ledger/balance/${accountId}`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/payouts", async (request, reply) => {
    const response = await fetch(`${base()}/payouts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/payouts", async (request, reply) => {
    const response = await fetch(`${base()}/payouts`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/payouts/me", async (request, reply) => {
    const response = await fetch(`${base()}/payouts/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });
}
