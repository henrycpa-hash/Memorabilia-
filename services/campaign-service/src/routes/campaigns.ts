import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { campaignService } from "../domain/campaign.service";

const createSchema = z.object({
  campaignType: z.enum([
    "countdown_drop",
    "loyalty_reward",
    "referral_boost",
    "watchlist_conversion",
    "holder_only_drop",
    "auction_promo",
    "post_sale_highlight"
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  audienceType: z.enum([
    "all_followers",
    "all_watchers",
    "asset_watchers",
    "creator_holders",
    "top_collectors",
    "referral_participants",
    "inactive_users_reactivation"
  ]),
  rewardType: z.string().optional(),
  assetId: z.string().optional()
});

const trackSchema = z.object({
  eventType: z.enum(["click", "convert", "view", "share"]),
  payload: z.record(z.unknown()).optional()
});

export function registerCampaignRoutes(app: FastifyInstance) {
  // Creator-only campaign creation. Wave 4 also allows admins.
  app.post(
    "/campaigns",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createSchema.parse(request.body);
      const c = await campaignService.create({
        creatorId: request.auth!.userId,
        ...input
      });
      reply.code(201).send(c);
    }
  );

  app.get("/campaigns", async () => campaignService.list());

  app.get("/campaigns/live", async () => campaignService.listLive());

  app.get("/campaigns/by-creator/:creatorId", async (request) => {
    const { creatorId } = request.params as { creatorId: string };
    return campaignService.listForCreator(creatorId);
  });

  app.get("/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = campaignService.findById(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });

  app.post(
    "/campaigns/:id/launch",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const c = await campaignService.launch(id);
      if (!c) return reply.code(404).send({ error: "not_found" });
      return c;
    }
  );

  app.post(
    "/campaigns/:id/end",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const c = await campaignService.end(id);
      if (!c) return reply.code(404).send({ error: "not_found" });
      return c;
    }
  );

  app.post("/campaigns/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = trackSchema.parse(request.body);
    const e = await campaignService.track({
      campaignId: id,
      eventType: input.eventType,
      payload: input.payload
    });
    reply.code(201).send(e);
  });

  app.get("/campaigns/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return campaignService.events(id);
  });

  app.get("/campaigns/:id/metrics", async (request) => {
    const { id } = request.params as { id: string };
    return campaignService.metrics(id);
  });
}
