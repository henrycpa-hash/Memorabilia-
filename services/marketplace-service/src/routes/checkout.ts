import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { performCheckout } from "../domain/checkout.service";
import { orderRepo } from "../repo/order.repo";

const checkoutSchema = z.object({
  listingId: z.string(),
  buyerId: z.string()
});

export function registerCheckoutRoutes(app: FastifyInstance) {
  app.post("/checkout", async (request, reply) => {
    const input = checkoutSchema.parse(request.body);
    try {
      const order = await performCheckout(input);
      reply.code(201).send(order);
    } catch (err) {
      reply.code(409).send({ error: (err as Error).message });
    }
  });

  app.get("/orders", async () => orderRepo.list());

  app.get("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = orderRepo.getById(id);
    if (!order) return reply.code(404).send({ error: "not_found" });
    return order;
  });
}
