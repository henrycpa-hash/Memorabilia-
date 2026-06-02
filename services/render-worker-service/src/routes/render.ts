import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { renderService } from "../domain/render.service";

const enqueueSchema = z.object({
  assetId: z.string(),
  templateKey: z.enum([
    "auction_winner_card",
    "record_sale_card",
    "creator_drop_card",
    "countdown_card",
    "collectible_heat_card",
    "royalty_enabled_card",
    "verified_trade_milestone_card"
  ]),
  payload: z.record(z.unknown()).optional()
});

export function registerRenderRoutes(app: FastifyInstance) {
  app.post("/render/jobs", async (request, reply) => {
    const input = enqueueSchema.parse(request.body);
    const j = await renderService.enqueue(input);
    reply.code(201).send(j);
  });

  app.get("/render/jobs", async () => renderService.list());

  app.get("/render/jobs/by-asset/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return renderService.listForAsset(assetId);
  });

  app.get("/render/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const j = renderService.findById(id);
    if (!j) return reply.code(404).send({ error: "not_found" });
    return j;
  });

  // Drain queued jobs. In Wave 5 this is a real cron loop.
  app.post("/workers/render/tick", async (_request, reply) => {
    const result = await renderService.runJobs();
    reply.send(result);
  });
}
