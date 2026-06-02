import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { shippingService } from "../domain/shipping.service";

const createSchema = z.object({
  settlementId: z.string(),
  assetId: z.string(),
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  weightOz: z.number().positive(),
  declaredValue: z.number().positive(),
  deliveryMode: z.enum(["standard", "signature_required", "vault_handoff"]).default("standard"),
  carrier: z.enum(["ups", "fedex", "usps", "dhl", "vault_courier", "mock"]).optional()
});

const eventSchema = z.object({
  eventType: z.enum([
    "label_created", "picked_up", "in_transit", "out_for_delivery", "delivered", "exception", "lost"
  ]),
  description: z.string().min(1),
  location: z.string().optional()
});

export function registerShippingRoutes(app: FastifyInstance) {
  app.post("/shipments", async (request, reply) => {
    const input = createSchema.parse(request.body);
    const s = await shippingService.createShipment(input);
    reply.code(201).send(s);
  });

  app.get("/shipments", { preHandler: requireRole("admin") }, async () => shippingService.list());

  app.get("/shipments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = shippingService.findById(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  app.get("/shipments/by-settlement/:settlementId", async (request) => {
    const { settlementId } = request.params as { settlementId: string };
    return shippingService.bySettlement(settlementId);
  });

  app.get("/shipments/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return shippingService.events(id);
  });

  app.post("/shipments/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = eventSchema.parse(request.body);
    const updated = await shippingService.ingestEvent({ shipmentId: id, ...input });
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });
}
