import type { FastifyInstance } from "fastify";

const base = () => process.env.FINANCE_EXPORT_SERVICE_URL || "http://localhost:4033";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerFinanceExportRoutes(app: FastifyInstance) {
  app.post("/api/finance/invoices", async (request, reply) => {
    const r = await fetch(`${base()}/finance/invoices`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/finance/invoices", async (request, reply) => {
    const r = await fetch(`${base()}/finance/invoices`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/finance/invoices/by-settlement/:settlementId", async (request, reply) => {
    const { settlementId } = request.params as { settlementId: string };
    const r = await fetch(`${base()}/finance/invoices/by-settlement/${settlementId}`);
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/finance/invoices/:id/mark-paid", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/finance/invoices/${id}/mark-paid`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/finance/invoices/:id/void", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/finance/invoices/${id}/void`, {
      method: "POST", headers: authHeaders(request)
    });
    reply.code(r.status).send(await r.json());
  });

  app.post("/api/finance/exports/royalty-statements", async (request, reply) => {
    const r = await fetch(`${base()}/finance/exports/royalty-statements`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body || {})
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/finance/exports/journal-entries", async (request, reply) => {
    const r = await fetch(`${base()}/finance/exports/journal-entries`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body || {})
    });
    reply.code(r.status).send(await r.json());
  });
  app.post("/api/finance/exports/tax-summaries", async (request, reply) => {
    const r = await fetch(`${base()}/finance/exports/tax-summaries`, {
      method: "POST", headers: authHeaders(request),
      body: JSON.stringify(request.body || {})
    });
    reply.code(r.status).send(await r.json());
  });

  app.get("/api/finance/exports", async (request, reply) => {
    const r = await fetch(`${base()}/finance/exports`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/finance/exports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/finance/exports/${id}`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status).send(await r.json());
  });
  app.get("/api/finance/exports/:id/csv", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await fetch(`${base()}/finance/exports/${id}/csv`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(r.status);
    const contentType = r.headers.get("content-type");
    if (contentType) reply.header("content-type", contentType);
    const disposition = r.headers.get("content-disposition");
    if (disposition) reply.header("content-disposition", disposition);
    return await r.text();
  });
}
