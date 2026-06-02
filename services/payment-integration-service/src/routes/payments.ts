import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { paymentService } from "../domain/payment.service";

const createIntentSchema = z.object({
  settlementId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  provider: z.enum(["stripe", "adyen", "mock"]).default("mock"),
  paymentMethodType: z.string().default("card"),
  metadata: z.record(z.string()).optional()
});

const payoutSchema = z.object({
  settlementId: z.string(),
  payeeId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  provider: z.enum(["stripe", "adyen", "mock"]).default("mock"),
  metadata: z.record(z.unknown()).optional()
});

export function registerPaymentRoutes(app: FastifyInstance) {
  app.post("/payments/intents", async (request, reply) => {
    const input = createIntentSchema.parse(request.body);
    const intent = await paymentService.createIntent(input);
    reply.code(201).send(intent);
  });

  app.get("/payments/intents", { preHandler: requireRole("admin") }, async () =>
    paymentService.listIntents()
  );

  app.get("/payments/intents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const intent = paymentService.findIntent(id);
    if (!intent) return reply.code(404).send({ error: "not_found" });
    return intent;
  });

  app.get("/payments/intents/by-settlement/:settlementId", async (request) => {
    const { settlementId } = request.params as { settlementId: string };
    return paymentService.intentsForSettlement(settlementId);
  });

  app.get("/payments/intents/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return paymentService.listIntentEvents(id);
  });

  app.post("/payments/intents/:id/capture", async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await paymentService.captureIntent(id);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });

  app.post("/payments/intents/:id/refund", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ amount: z.number().positive().optional() }).parse(request.body || {});
    const updated = await paymentService.refundIntent(id, body.amount);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });

  app.post("/payments/intents/:id/void", async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await paymentService.voidIntent(id);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });

  // Payouts
  app.post("/payments/payouts", async (request, reply) => {
    const input = payoutSchema.parse(request.body);
    const payout = await paymentService.initiatePayout(input);
    reply.code(201).send(payout);
  });

  app.get("/payments/payouts", { preHandler: requireRole("admin") }, async () =>
    paymentService.listPayouts()
  );

  app.post("/payments/payouts/:id/mark-paid", async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await paymentService.markPayoutPaid(id);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });

  app.get("/payments/payouts/by-settlement/:settlementId", async (request) => {
    const { settlementId } = request.params as { settlementId: string };
    return paymentService.payoutsForSettlement(settlementId);
  });
}
