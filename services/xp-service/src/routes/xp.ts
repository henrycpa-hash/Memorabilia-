import type { FastifyInstance } from "fastify";
import { XP_ACTION_LIST, TIERS, type XpActionKey } from "@crownx-jewel/shared-xp";
import { xpService } from "../domain/xp.service";

export function registerXpRoutes(app: FastifyInstance) {
  // economy reference (actions + tiers) — numbers come FROM shared-xp
  app.get("/xp/economy", async () => ({ actions: XP_ACTION_LIST, tiers: TIERS }));

  app.post("/xp/grant", async (request, reply) => {
    const b = (request.body || {}) as {
      userId?: string;
      action?: XpActionKey;
      units?: number;
      multiplier?: number;
      assetId?: string;
      refRenderId?: string;
      onChainRef?: string;
    };
    if (!b.userId || !b.action) return reply.code(400).send({ error: "userId_and_action_required" });
    return xpService.grant({ userId: b.userId, action: b.action, units: b.units, multiplier: b.multiplier, assetId: b.assetId, refRenderId: b.refRenderId, onChainRef: b.onChainRef });
  });

  app.post("/xp/invite-conversion", async (request, reply) => {
    const b = (request.body || {}) as { sharerId?: string; sharerLevel?: number; inviteeId?: string; refRenderId?: string; onChainRef?: string };
    if (!b.sharerId || !b.inviteeId) return reply.code(400).send({ error: "sharerId_and_inviteeId_required" });
    return xpService.grantInviteConversion({ sharerId: b.sharerId, sharerLevel: b.sharerLevel ?? 1, inviteeId: b.inviteeId, refRenderId: b.refRenderId, onChainRef: b.onChainRef });
  });

  app.post("/xp/streak/checkin", async (request, reply) => {
    const b = (request.body || {}) as { userId?: string };
    if (!b.userId) return reply.code(400).send({ error: "userId_required" });
    return xpService.grant({ userId: b.userId, action: "daily_return" });
  });

  app.get("/xp/rank/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return xpService.rank(userId);
  });

  app.get("/xp/ledger/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return xpService.ledgerFor(userId);
  });

  app.get("/xp/leaderboard", async (request) => {
    const { limit } = request.query as { limit?: string };
    return xpService.leaderboard(limit ? Number(limit) : 20);
  });
}
