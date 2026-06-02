import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { shareCardService, ShareCardTypes } from "../domain/share-card.service";

const createSchema = z.object({
  assetId: z.string(),
  slug: z.string().optional(),
  cardType: z.enum(ShareCardTypes),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  publicUrl: z.string().optional()
});

export function registerShareCardRoutes(app: FastifyInstance) {
  // Posted by orchestration flows in the gateway / marketplace-service.
  app.post("/share-cards", async (request, reply) => {
    const input = createSchema.parse(request.body);
    const card = await shareCardService.create(input);
    reply.code(201).send(card);
  });

  app.get("/share-cards/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return shareCardService.listForAsset(assetId);
  });

  app.get("/share-cards", async () => shareCardService.list());
}
