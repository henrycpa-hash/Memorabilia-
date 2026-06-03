import type { FastifyInstance } from "fastify";
import { posInt } from "@crownx-jewel/shared-kernel";
import { feedService } from "../domain/feed.service";

export function registerFeedRoutes(app: FastifyInstance) {
  app.get("/feed", async (request) => {
    const { limit } = request.query as { limit?: string };
    return feedService.list(limit ? Number(limit) : 40);
  });
  app.get("/feed/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = feedService.get(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // create posts
  app.post("/feed/mint", async (request, reply) => {
    const b = (request.body || {}) as { authorId?: string; authorName?: string; item?: Parameters<typeof feedService.createMint>[0]["item"] };
    if (!b.authorId || !b.item) return reply.code(400).send({ error: "authorId_and_item_required" });
    return reply.code(201).send(feedService.createMint({ authorId: b.authorId, authorName: b.authorName || b.authorId, item: b.item }));
  });
  app.post("/feed/listing", async (request, reply) => {
    const b = (request.body || {}) as { authorId?: string; authorName?: string; item?: Parameters<typeof feedService.createListing>[0]["item"]; priceCents?: number };
    if (!b.authorId || !b.item || !b.priceCents) return reply.code(400).send({ error: "authorId_item_priceCents_required" });
    return reply.code(201).send(feedService.createListing({ authorId: b.authorId, authorName: b.authorName || b.authorId, item: b.item, priceCents: b.priceCents }));
  });
  app.post("/feed/auction", async (request, reply) => {
    const b = (request.body || {}) as { authorId?: string; authorName?: string; item?: Parameters<typeof feedService.createAuction>[0]["item"]; startBidCents?: number; durationMins?: number };
    if (!b.authorId || !b.item || !b.startBidCents) return reply.code(400).send({ error: "authorId_item_startBidCents_required" });
    return reply.code(201).send(feedService.createAuction({ authorId: b.authorId, authorName: b.authorName || b.authorId, item: b.item, startBidCents: b.startBidCents, durationMins: b.durationMins }));
  });
  app.post("/feed/athlete-news", async (request, reply) => {
    const b = (request.body || {}) as { authorId?: string; authorName?: string; athleteId?: string; athleteName?: string; title?: string; body?: string; signalPatch?: Record<string, number> };
    if (!b.authorId || !b.athleteId || !b.title) return reply.code(400).send({ error: "authorId_athleteId_title_required" });
    return reply.code(201).send(await feedService.createAthleteNews({ authorId: b.authorId, authorName: b.authorName || b.authorId, athleteId: b.athleteId, athleteName: b.athleteName || b.athleteId, title: b.title, body: b.body || "", signalPatch: b.signalPatch }));
  });
  app.post("/feed/promo", async (request, reply) => {
    const b = (request.body || {}) as { authorId?: string; authorName?: string; title?: string; body?: string };
    if (!b.authorId || !b.title) return reply.code(400).send({ error: "authorId_title_required" });
    return reply.code(201).send(feedService.createPromo({ authorId: b.authorId, authorName: b.authorName || b.authorId, title: b.title, body: b.body || "" }));
  });

  // engagement
  app.post("/feed/:id/comment", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string; userName?: string; text?: string };
    if (!b.userId || !b.text) return reply.code(400).send({ error: "userId_and_text_required" });
    const r = feedService.comment(id, b.userId, b.userName || b.userId, b.text);
    if ("error" in r) return reply.code(r.error === "not_found" ? 404 : 409).send(r);
    return reply.code(201).send(r);
  });
  app.post("/feed/:id/boost", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string };
    if (!b.userId) return reply.code(400).send({ error: "userId_required" });
    const r = feedService.boost(id, b.userId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.post("/feed/:id/react", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = feedService.react(id);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  // live bids + buy → pack-n-ship
  app.post("/feed/:id/bid", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string; userName?: string; amountCents?: number };
    const amount = posInt(b.amountCents);
    if (!b.userId || amount === null) return reply.code(400).send({ error: "userId_and_positive_amountCents_required" });
    const r = feedService.bid(id, b.userId, b.userName || b.userId, amount);
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });
  app.post("/feed/:id/buy", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { buyerId?: string };
    if (!b.buyerId) return reply.code(400).send({ error: "buyerId_required" });
    const r = await feedService.buy(id, b.buyerId);
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });
  app.post("/feed/:id/settle-auction", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await feedService.settleAuction(id);
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });
}
