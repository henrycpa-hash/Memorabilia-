import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { disputeService } from "../domain/dispute.service";

const openSchema = z.object({
  settlementId: z.string(),
  disputeType: z.enum([
    "item_not_as_described",
    "authenticity_challenge",
    "shipping_damage",
    "payment_issue",
    "seller_non_performance",
    "buyer_non_performance"
  ]),
  reason: z.string().min(1)
});

const messageSchema = z.object({ body: z.string().min(1) });
const resolveSchema = z.object({
  resolutionType: z.enum(["release", "refund", "split"])
});

export function registerDisputeRoutes(app: FastifyInstance) {
  // Buyer or seller can open a dispute. Admins listed too for ops support.
  app.post("/disputes", { preHandler: requireAuth }, async (request, reply) => {
    const input = openSchema.parse(request.body);
    const d = await disputeService.open({
      settlementId: input.settlementId,
      openedByUserId: request.auth!.userId,
      disputeType: input.disputeType,
      reason: input.reason
    });
    reply.code(201).send(d);
  });

  app.get(
    "/disputes",
    { preHandler: requireRole("admin") },
    async () => disputeService.list()
  );

  app.get("/disputes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const d = disputeService.findById(id);
    if (!d) return reply.code(404).send({ error: "not_found" });
    return d;
  });

  app.get("/disputes/by-settlement/:settlementId", async (request) => {
    const { settlementId } = request.params as { settlementId: string };
    return disputeService.listForSettlement(settlementId);
  });

  app.post(
    "/disputes/:id/messages",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = messageSchema.parse(request.body);
      const m = await disputeService.addMessage({
        disputeId: id,
        actorId: request.auth!.userId,
        body: body.body
      });
      reply.code(201).send(m);
    }
  );

  app.get("/disputes/:id/messages", async (request) => {
    const { id } = request.params as { id: string };
    return disputeService.messages(id);
  });

  // Admins resolve disputes.
  app.post(
    "/disputes/:id/resolve",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = resolveSchema.parse(request.body);
      const d = await disputeService.resolve({
        disputeId: id,
        resolutionType: body.resolutionType,
        actorId: request.auth!.userId
      });
      if (!d) return reply.code(404).send({ error: "not_found" });
      return d;
    }
  );

  app.post(
    "/disputes/:id/close",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const d = await disputeService.close(id);
      if (!d) return reply.code(404).send({ error: "not_found" });
      return d;
    }
  );
}
