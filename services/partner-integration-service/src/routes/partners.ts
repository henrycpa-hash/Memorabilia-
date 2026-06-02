import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { partnerService } from "../domain/partner.service";

const createSchema = z.object({
  partnerType: z.enum(["dealer", "auction_house", "league", "school", "marketplace"]),
  name: z.string().min(1),
  configJson: z.record(z.unknown()).optional(),
  tenantId: z.string().optional()
});

const webhookSchema = z.object({
  eventType: z.string().min(1),
  payloadJson: z.record(z.unknown())
});

export function registerPartnerRoutes(app: FastifyInstance) {
  app.post("/partners", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = createSchema.parse(request.body);
    const p = await partnerService.create(input);
    reply.code(201).send(p);
  });

  app.get("/partners", async () => partnerService.list());
  app.get("/partners/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return partnerService.byTenant(tenantId);
  });
  app.get("/partners/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = partnerService.findById(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.post("/partners/:id/suspend", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = partnerService.suspend(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // Inventory
  app.post("/partners/:id/inventory/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ cursor: z.string().optional() }).parse(request.body || {});
    const result = await partnerService.syncInventory(id, body.cursor);
    if (!result) return reply.code(404).send({ error: "partner_not_found" });
    reply.code(201).send(result);
  });

  app.get("/partners/:id/inventory", async (request) => {
    const { id } = request.params as { id: string };
    return partnerService.inventoryFor(id);
  });

  app.post("/partners/inventory/:partnerInventoryId/map", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { partnerInventoryId } = request.params as { partnerInventoryId: string };
    const body = z.object({ mappedAssetId: z.string() }).parse(request.body);
    const r = await partnerService.mapInventory(partnerInventoryId, body.mappedAssetId);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // Webhooks
  app.post("/partners/:id/webhooks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = webhookSchema.parse(request.body);
    const w = await partnerService.receiveWebhook({ partnerId: id, ...input });
    if (!w) return reply.code(404).send({ error: "partner_not_found" });
    reply.code(201).send(w);
  });

  app.get("/partners/:id/webhooks", async (request) => {
    const { id } = request.params as { id: string };
    return partnerService.webhooksFor(id);
  });

  // Outbound: settlement status syndication
  app.post("/partners/:id/syndicate-status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      externalItemId: z.string(),
      status: z.string(),
      payload: z.record(z.unknown()).optional()
    }).parse(request.body);
    const r = await partnerService.syndicateSettlementStatus({ partnerId: id, ...body });
    return r;
  });
}
