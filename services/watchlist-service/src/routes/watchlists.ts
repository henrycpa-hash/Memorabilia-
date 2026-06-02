import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@crownx-jewel/shared-auth/guards";
import { watchlistService } from "../domain/watchlist.service";

const addSchema = z.object({ assetId: z.string() });

export function registerWatchlistRoutes(app: FastifyInstance) {
  app.post(
    "/watchlists",
    { preHandler: requireAuth },
    async (request, reply) => {
      const input = addSchema.parse(request.body);
      const entry = await watchlistService.add(request.auth!.userId, input.assetId);
      reply.code(201).send(entry);
    }
  );

  app.delete(
    "/watchlists/:assetId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { assetId } = request.params as { assetId: string };
      const removed = await watchlistService.remove(request.auth!.userId, assetId);
      if (!removed) return reply.code(404).send({ error: "not_found" });
      reply.send({ ok: true });
    }
  );

  app.get(
    "/watchlists/me",
    { preHandler: requireAuth },
    async (request) => watchlistService.listForUser(request.auth!.userId)
  );

  // Public count (used by story page aggregator)
  app.get("/watchlists/count/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return { count: watchlistService.countForAsset(assetId) };
  });
}
