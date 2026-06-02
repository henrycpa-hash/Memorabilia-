import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { assetService } from "../domain/asset.service";

const createListingSchema = z.object({
  assetId: z.string(),
  sellerId: z.string(),
  price: z.number().positive()
});

export function registerListingRoutes(app: FastifyInstance) {
  app.post(
    "/listings",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createListingSchema.parse(request.body);
      const asset = assetService.getById(input.assetId);
      if (!asset) {
        return reply.code(404).send({ error: "asset_not_found" });
      }
      if (asset.authenticityStatus !== "approved") {
        return reply.code(409).send({ error: "asset_not_approved" });
      }
      const listing = await assetService.createListing(input);
      reply.code(201).send(listing);
    }
  );

  app.get("/listings", async () => assetService.listListings());
}
