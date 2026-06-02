import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { assetService } from "../domain/asset.service";
import { timelineService } from "../domain/timeline.service";

const createAssetSchema = z.object({
  originatorId: z.string(),
  currentOwnerId: z.string(),
  assetType: z.enum(["memorabilia", "art", "nil_experience", "hybrid"]),
  title: z.string().min(1),
  description: z.string().optional(),
  editionType: z.enum(["one_of_one", "limited", "open"]),
  editionNumber: z.number().int().positive().optional(),
  totalEditionSize: z.number().int().positive().optional()
});

export function registerAssetRoutes(app: FastifyInstance) {
  app.post(
    "/assets",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createAssetSchema.parse(request.body);
      const asset = await assetService.create(input);
      reply.code(201).send(asset);
    }
  );

  app.get("/assets", async () => assetService.list());

  app.get("/assets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = assetService.getById(id);
    if (!asset) return reply.code(404).send({ error: "not_found" });
    return asset;
  });

  // ---------- Wave 2: public + vault ----------
  app.get("/public/assets", async () => assetService.listPublic());

  app.get("/public/assets/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const asset = assetService.findBySlug(slug);
    if (!asset || asset.visibility !== "public") {
      return reply.code(404).send({ error: "not_found" });
    }
    return asset;
  });

  app.get(
    "/vault/me",
    { preHandler: requireAuth },
    async (request) => {
      return assetService.listByOwner(request.auth!.userId);
    }
  );

  // ---------- Internal (called by gateway and other services) ----------
  app.post("/internal/assets/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const asset = await assetService.markApproved(id);
    if (!asset) return reply.code(404).send({ error: "not_found" });
    reply.send(asset);
  });

  app.post("/internal/assets/:id/transfer", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ newOwnerId: z.string() }).parse(request.body);
    const asset = await assetService.transferOwnership(id, body.newOwnerId);
    if (!asset) return reply.code(404).send({ error: "not_found" });
    reply.send(asset);
  });

  app.post("/internal/listings/:id/mark-sold", async (request, reply) => {
    const { id } = request.params as { id: string };
    const listing = assetService.markListingSold(id);
    if (!listing) return reply.code(404).send({ error: "not_found" });
    reply.send(listing);
  });

  // ---------- Wave 3: ownership timeline projection ----------
  app.get("/assets/:id/timeline", async (request) => {
    const { id } = request.params as { id: string };
    return timelineService.get(id);
  });

  /**
   * Internal: append a timeline event. Called by marketplace-service on sale
   * completion, by auction-service on auction creation, by offer-service on
   * accepted-offer, etc. Wave 4 swaps these point-to-point calls for an
   * outbox-driven projector.
   */
  const timelineAppendSchema = z.object({
    type: z.enum([
      "asset_registered",
      "evidence_uploaded",
      "auth_approved",
      "coa_issued",
      "listing_created",
      "auction_created",
      "offer_accepted",
      "sale_completed",
      "ownership_transferred"
    ]),
    label: z.string().min(1),
    publicNote: z.string().optional(),
    price: z.number().positive().optional()
  });

  app.post("/internal/assets/:id/timeline", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = timelineAppendSchema.parse(request.body);
    const events = timelineService.append({ assetId: id, ...body });
    reply.code(201).send(events);
  });
}
