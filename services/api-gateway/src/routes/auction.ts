import type { FastifyInstance } from "fastify";

const base = () => process.env.AUCTION_SERVICE_URL || "http://localhost:4009";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerAuctionRoutes(app: FastifyInstance) {
  app.post("/api/auctions", async (request, reply) => {
    const response = await fetch(`${base()}/auctions`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/auctions", async (_request, reply) => {
    const response = await fetch(`${base()}/auctions`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/auctions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/auctions/${id}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/auctions/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/auctions/by-asset/${assetId}`);
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/auctions/active/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const response = await fetch(`${base()}/auctions/active/by-asset/${assetId}`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/auctions/:id/bids", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/auctions/${id}/bids`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/auctions/:id/bids", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/auctions/${id}/bids`);
    reply.code(response.status).send(await response.json());
  });
}
