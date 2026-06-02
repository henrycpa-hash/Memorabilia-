import type { FastifyInstance } from "fastify";

const base = () => process.env.WATCHLIST_SERVICE_URL || "http://localhost:4011";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerWatchlistRoutes(app: FastifyInstance) {
  app.post("/api/watchlists", async (request, reply) => {
    const response = await fetch(`${base()}/watchlists`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.delete("/api/watchlists/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/watchlists/${assetId}`, {
      method: "DELETE",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/watchlists/me", async (request, reply) => {
    const response = await fetch(`${base()}/watchlists/me`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/watchlists/count/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/watchlists/count/${assetId}`);
    reply.code(response.status).send(await response.json());
  });
}
