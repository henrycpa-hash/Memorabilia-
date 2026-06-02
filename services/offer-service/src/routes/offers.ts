import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@crownx-jewel/shared-auth/guards";
import { offerService } from "../domain/offer.service";

const submitSchema = z.object({
  assetId: z.string(),
  listingId: z.string().optional(),
  sellerId: z.string(),
  amount: z.number().positive(),
  expiresAt: z.string().optional()
});

const counterSchema = z.object({
  amount: z.number().positive()
});

export function registerOfferRoutes(app: FastifyInstance) {
  app.post("/offers", { preHandler: requireAuth }, async (request, reply) => {
    const input = submitSchema.parse(request.body);
    const offer = await offerService.submit({
      assetId: input.assetId,
      listingId: input.listingId,
      sellerId: input.sellerId,
      buyerId: request.auth!.userId,
      amount: input.amount,
      expiresAt: input.expiresAt
    });
    reply.code(201).send(offer);
  });

  app.post(
    "/offers/:id/counter",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = counterSchema.parse(request.body);
      try {
        const offer = await offerService.counter({
          offerId: id,
          sellerId: request.auth!.userId,
          amount: body.amount
        });
        reply.send(offer);
      } catch (err) {
        reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  app.post(
    "/offers/:id/accept",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const offer = await offerService.accept({
          offerId: id,
          actorId: request.auth!.userId
        });
        reply.send(offer);
      } catch (err) {
        reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  app.post(
    "/offers/:id/reject",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const offer = await offerService.reject({
          offerId: id,
          actorId: request.auth!.userId
        });
        reply.send(offer);
      } catch (err) {
        reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  app.get("/offers", async () => offerService.list());

  app.get("/offers/by-asset/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return offerService.listForAsset(assetId);
  });

  app.get("/offers/count-accepted/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return { count: offerService.countAccepted(assetId) };
  });

  app.get("/offers/me", { preHandler: requireAuth }, async (request) => {
    const buyerOffers = offerService.listForBuyer(request.auth!.userId);
    const sellerOffers = offerService.listForSeller(request.auth!.userId);
    return { asBuyer: buyerOffers, asSeller: sellerOffers };
  });

  app.get("/offers/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return offerService.events(id);
  });
}
