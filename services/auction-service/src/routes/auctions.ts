import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { auctionService } from "../domain/auction.service";

const createAuctionSchema = z.object({
  assetId: z.string(),
  sellerId: z.string(),
  reservePrice: z.number().positive(),
  startingBid: z.number().positive(),
  minIncrement: z.number().positive(),
  startsAt: z.string(),
  endsAt: z.string()
});

const bidSchema = z.object({
  amount: z.number().positive()
});

export function registerAuctionRoutes(app: FastifyInstance) {
  app.post(
    "/auctions",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createAuctionSchema.parse(request.body);
      const auction = await auctionService.create(input);
      reply.code(201).send(auction);
    }
  );

  app.get("/auctions", async () => auctionService.list());

  app.get("/auctions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const list = auctionService.list();
    const auction = list.find((a) => a.id === id);
    if (!auction) return reply.code(404).send({ error: "not_found" });
    return auction;
  });

  app.get("/auctions/by-asset/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return auctionService.listByAsset(assetId);
  });

  app.get("/auctions/active/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const auction = auctionService.findActiveByAsset(assetId);
    if (!auction) return reply.code(404).send({ error: "no_active_auction" });
    return auction;
  });

  app.post(
    "/auctions/:id/bids",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = bidSchema.parse(request.body);
      try {
        const bid = await auctionService.placeBid({
          auctionId: id,
          bidderId: request.auth!.userId,
          amount: body.amount
        });
        reply.code(201).send(bid);
      } catch (err) {
        reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  app.get("/auctions/:id/bids", async (request) => {
    const { id } = request.params as { id: string };
    return auctionService.listBids(id);
  });

  // ---------- Wave 4: auction-close worker ----------
  app.post("/workers/auction-close/tick", async (_request, reply) => {
    const result = await auctionService.closeDueAuctions();
    reply.send(result);
  });
}
