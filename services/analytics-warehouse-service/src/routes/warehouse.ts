import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { warehouseService } from "../domain/warehouse.service";

const factSchema = z.object({
  eventType: z.enum([
    "listing_published",
    "offer_submitted",
    "offer_accepted",
    "auction_closed",
    "sale_completed",
    "payout_released",
    "share_card_rendered",
    "campaign_launched",
    "campaign_clicked",
    "campaign_converted",
    "settlement_held",
    "dispute_opened",
    "dispute_resolved",
    "fraud_flag_raised"
  ]),
  assetId: z.string(),
  creatorId: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  userId: z.string().optional().nullable(),
  sourceId: z.string()
});

export function registerWarehouseRoutes(app: FastifyInstance) {
  app.post("/warehouse/facts", async (request, reply) => {
    const input = factSchema.parse(request.body);
    const f = await warehouseService.insertFact({
      eventType: input.eventType,
      assetId: input.assetId,
      creatorId: input.creatorId ?? null,
      amount: input.amount ?? null,
      userId: input.userId ?? null,
      sourceId: input.sourceId
    });
    reply.code(201).send(f);
  });

  app.get("/warehouse/facts", async (request) => {
    const q = (request.query as Record<string, string>) || {};
    if (q.eventType) return warehouseService.listByType(q.eventType);
    return warehouseService.list();
  });

  app.get("/warehouse/metrics", async () => warehouseService.kpis());
}
