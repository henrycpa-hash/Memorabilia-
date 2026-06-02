import type { FastifyInstance } from "fastify";
import type { AthleteSignals } from "@crownx-jewel/shared-valuation";
import { athleteService } from "../domain/athlete.service";

export function registerAthleteRoutes(app: FastifyInstance) {
  // the ticker
  app.get("/athletes", async () => athleteService.list());

  // resolve by slug or id
  app.get("/athletes/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const a = athleteService.get(key) || athleteService.bySlug(key);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return athleteService.detail(a);
  });

  // ingest any data point → recompute → annotated ticker move
  app.post("/athletes/:id/signals", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { patch?: Partial<AthleteSignals>; event?: { tag: string; label: string; note?: string } };
    if (!b.patch) return reply.code(400).send({ error: "patch_required" });
    const r = athleteService.ingestSignal(id, b.patch, b.event);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // fractionalization — buy a piece of the athlete
  app.post("/athletes/:id/fractions/buy", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string; shares?: number };
    if (!b.userId || !b.shares) return reply.code(400).send({ error: "userId_and_shares_required" });
    const r = athleteService.buyFractions(id, b.userId, Math.floor(b.shares));
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });

  app.get("/athletes/:id/holdings/:userId", async (request) => {
    const { id, userId } = request.params as { id: string; userId: string };
    return athleteService.holding(id, userId);
  });

  // a tracked, chain-anchored resale royalty (feeds index + Legacy Circle chain)
  app.post("/athletes/:id/royalty-event", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { assetId?: string; fromUserId?: string; toUserId?: string; salePriceCents?: number };
    if (!b.assetId || !b.fromUserId || !b.toUserId || !b.salePriceCents) {
      return reply.code(400).send({ error: "assetId_fromUserId_toUserId_salePriceCents_required" });
    }
    const r = athleteService.royaltyEvent(id, { assetId: b.assetId, fromUserId: b.fromUserId, toUserId: b.toUserId, salePriceCents: b.salePriceCents });
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  app.get("/athletes/:id/royalty-ledger", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.royaltyLedger(id);
  });

  // the Legacy Circle — chain of owners for an asset, and all members for an athlete
  app.get("/athletes/:id/legacy/:assetId", async (request) => {
    const { id, assetId } = request.params as { id: string; assetId: string };
    return athleteService.legacyChain(id, assetId);
  });
  app.get("/athletes/:id/legacy", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.legacyCircle(id);
  });
}
