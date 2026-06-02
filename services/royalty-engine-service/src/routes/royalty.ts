import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { royaltyService } from "../domain/royalty.service";

const createRuleSchema = z.object({
  assetId: z.string(),
  beneficiaries: z
    .array(
      z.object({
        beneficiaryId: z.string(),
        percentage: z.number().positive().max(100)
      })
    )
    .min(1)
});

const calculateSchema = z.object({
  orderId: z.string(),
  assetId: z.string(),
  saleAmount: z.number().positive()
});

export function registerRoyaltyRoutes(app: FastifyInstance) {
  app.post("/rules", async (request, reply) => {
    const input = createRuleSchema.parse(request.body);
    const rule = await royaltyService.createRule(input);
    reply.code(201).send(rule);
  });

  app.get("/rules", async () => royaltyService.listRules());

  app.get("/rules/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const rule = royaltyService.getRuleByAssetId(assetId);
    if (!rule) return reply.code(404).send({ error: "not_found" });
    return rule;
  });

  app.get("/distributions", async () => royaltyService.listDistributions());

  // ---------- Internal: called by marketplace-service during checkout ----------
  app.post("/internal/calculate", async (request, reply) => {
    const input = calculateSchema.parse(request.body);
    const result = await royaltyService.calculateForSale(
      input.orderId,
      input.assetId,
      input.saleAmount
    );
    reply.send(result);
  });
}
