import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { crmService } from "../domain/crm.service";

const segmentDefSchema = z.object({
  role: z.enum(["fan", "collector", "creator"]).optional(),
  minOwnedAssets: z.number().int().nonnegative().optional(),
  minWatchlistCount: z.number().int().nonnegative().optional(),
  minSpend: z.number().nonnegative().optional(),
  lastActivityWithinDays: z.number().int().nonnegative().optional(),
  noPurchaseWithinDays: z.number().int().nonnegative().optional(),
  creatorAffinityId: z.string().optional(),
  collectorTier: z.enum(["casual", "engaged", "high_value", "vip"]).optional()
});

const createSegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  definition: segmentDefSchema
});

const profileSchema = z.object({
  userId: z.string(),
  role: z.enum(["fan", "collector", "creator"]),
  ownedAssets: z.number().int().nonnegative(),
  watchlistCount: z.number().int().nonnegative(),
  totalSpend: z.number().nonnegative(),
  lastActivityDaysAgo: z.number().int().nonnegative(),
  lastPurchaseDaysAgo: z.number().int().nonnegative().nullable(),
  creatorAffinityIds: z.array(z.string()),
  collectorTier: z.enum(["casual", "engaged", "high_value", "vip"])
});

const journeySchema = z.object({
  name: z.string().min(1),
  segmentId: z.string(),
  triggerEventType: z.string(),
  templateKey: z.string()
});

export function registerCrmRoutes(app: FastifyInstance) {
  app.post(
    "/crm/segments",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createSegmentSchema.parse(request.body);
      const s = await crmService.createSegment({
        creatorId: request.auth!.userId,
        ...input
      });
      reply.code(201).send(s);
    }
  );

  app.get("/crm/segments", async () => crmService.listSegments());
  app.get("/crm/segments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = crmService.findSegment(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/crm/segments/by-creator/:creatorId", async (request) => {
    const { creatorId } = request.params as { creatorId: string };
    return crmService.segmentsForCreator(creatorId);
  });
  app.delete(
    "/crm/segments/:id",
    { preHandler: requireRole("creator", "admin") },
    async (request) => {
      const { id } = request.params as { id: string };
      crmService.removeSegment(id);
      return { deleted: true, id };
    }
  );

  app.post(
    "/crm/segments/:id/materialize",
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const m = await crmService.materialize(id);
      if (!m) return reply.code(404).send({ error: "not_found" });
      reply.code(201).send(m);
    }
  );

  app.get("/crm/segments/:id/latest-materialization", async (request, reply) => {
    const { id } = request.params as { id: string };
    const m = crmService.latestMaterialization(id);
    if (!m) return reply.code(404).send({ error: "not_materialized" });
    return m;
  });

  // Profiles (warehouse worker pushes these)
  app.post("/crm/profiles", async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const p = crmService.upsertProfile(input);
    reply.code(201).send(p);
  });
  app.get("/crm/profiles", async () => crmService.listProfiles());
  app.get("/crm/profiles/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const p = crmService.findProfile(userId);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // Journeys
  app.post(
    "/crm/journeys",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = journeySchema.parse(request.body);
      const j = crmService.createJourney({
        creatorId: request.auth!.userId,
        ...input
      });
      reply.code(201).send(j);
    }
  );
  app.get("/crm/journeys", async () => crmService.listJourneys());
  app.get("/crm/journeys/by-creator/:creatorId", async (request) => {
    const { creatorId } = request.params as { creatorId: string };
    return crmService.journeysForCreator(creatorId);
  });
  app.post(
    "/crm/journeys/:id/toggle",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ enabled: z.boolean() }).parse(request.body);
      const j = crmService.toggleJourney(id, body.enabled);
      if (!j) return reply.code(404).send({ error: "not_found" });
      return j;
    }
  );
}
