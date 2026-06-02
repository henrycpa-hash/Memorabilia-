import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { rankingService, type SignalType } from "../domain/ranking.service";

const recordSchema = z.object({
  assetId: z.string(),
  signal: z.enum(["view", "watchlist", "share", "offer", "bid", "sale"])
});

export function registerTrendingRoutes(app: FastifyInstance) {
  // Internal: services post here whenever a scoring signal happens. Wave 3
  // leaves it open so the gateway can dispatch from any aggregator route
  // (story view → +1 view, etc.). Wave 4 swaps for an outbox consumer.
  app.post("/trending/signals", async (request, reply) => {
    const input = recordSchema.parse(request.body);
    const updated = await rankingService.record(
      input.assetId,
      input.signal as SignalType
    );
    reply.code(201).send(updated);
  });

  app.get("/trending/assets", async (request) => {
    const { limit } = request.query as { limit?: string };
    const n = limit ? Number(limit) : 50;
    return rankingService.listTop(n);
  });

  app.get("/trending/assets/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const ranking = rankingService.find(assetId);
    if (!ranking) return reply.code(404).send({ error: "not_found" });
    return ranking;
  });
}
