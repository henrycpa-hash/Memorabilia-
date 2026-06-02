import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { settlementService } from "../domain/settlement.service";

const createSchema = z.object({
  sourceType: z.enum(["order", "auction", "accepted_offer"]),
  sourceId: z.string(),
  assetId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  grossAmount: z.number().positive(),
  platformFeeAmount: z.number().nonnegative(),
  royaltyAmount: z.number().nonnegative(),
  sellerNetAmount: z.number().nonnegative(),
  riskSignals: z.array(z.string()).optional()
});

export function registerSettlementRoutes(app: FastifyInstance) {
  // Internal: gateway / auction-close-worker post here on sale events.
  app.post("/settlements", async (request, reply) => {
    const input = createSchema.parse(request.body);
    const s = await settlementService.createFromSale(input);
    reply.code(201).send(s);
  });

  app.get(
    "/settlements",
    { preHandler: requireRole("admin") },
    async () => settlementService.list()
  );

  app.get("/settlements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = settlementService.findById(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  app.get("/settlements/by-state/:state", async (request) => {
    const { state } = request.params as { state: string };
    return settlementService.listByState(state as never);
  });

  app.get(
    "/settlements/me",
    { preHandler: requireAuth },
    async (request) => {
      // Wave 4: returns settlements where the auth'd user is buyer or seller.
      const userId = request.auth!.userId;
      const all = settlementService.list();
      return all.filter((s) => s.buyerId === userId || s.sellerId === userId);
    }
  );

  app.get("/settlements/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return settlementService.events(id);
  });

  // ---- State transitions (admin / system only) ----
  app.post(
    "/settlements/:id/hold",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ reason: z.string() }).parse(request.body);
      const s = await settlementService.hold(id, body.reason);
      if (!s) return reply.code(404).send({ error: "not_found" });
      return s;
    }
  );

  app.post(
    "/settlements/:id/release",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const s = await settlementService.release(id);
      if (!s) return reply.code(404).send({ error: "not_found" });
      return s;
    }
  );

  app.post(
    "/settlements/:id/refund",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ reason: z.string() }).parse(request.body);
      const s = await settlementService.refund(id, body.reason);
      if (!s) return reply.code(404).send({ error: "not_found" });
      return s;
    }
  );

  // Internal: dispute-service hooks here when it opens a case.
  app.post("/internal/settlements/:id/hold", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ reason: z.string() }).parse(request.body);
    const s = await settlementService.hold(id, body.reason);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  // Tick the release worker manually. In Wave 5 this becomes a cron.
  app.post(
    "/workers/settlement-transition/tick",
    async (_request, reply) => {
      const result = await settlementService.tickReleaseWorker();
      reply.send(result);
    }
  );
}
