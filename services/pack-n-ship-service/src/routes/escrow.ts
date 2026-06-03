import type { FastifyInstance } from "fastify";
import { posInt } from "@crownx-jewel/shared-kernel";
import { escrowService } from "../domain/escrow.service";

export function registerEscrowRoutes(app: FastifyInstance) {
  app.get("/trades", async () => escrowService.list());
  app.get("/trades/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const t = escrowService.get(id);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return escrowService.view(t);
  });

  // SELL → create the trade
  app.post("/trades", async (request, reply) => {
    const b = (request.body || {}) as { assetId?: string; sellerId?: string; buyerId?: string; priceCents?: number };
    const price = posInt(b.priceCents);
    if (!b.assetId || !b.sellerId || !b.buyerId || price === null) return reply.code(400).send({ error: "assetId_sellerId_buyerId_positive_priceCents_required" });
    return reply.code(201).send(escrowService.create({ assetId: b.assetId, sellerId: b.sellerId, buyerId: b.buyerId, priceCents: price }));
  });

  const act = (fn: (id: string, body: Record<string, unknown>) => unknown) => async (request: { params: unknown; body: unknown }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    const { id } = request.params as { id: string };
    const r = fn(id, (request.body || {}) as Record<string, unknown>);
    if (r && typeof r === "object" && "error" in r) return reply.code(409).send(r);
    return reply.code(200).send(r);
  };

  app.post("/trades/:id/pay", act((id) => escrowService.payEscrow(id)));
  app.post("/trades/:id/package", act((id, b) => escrowService.packageAsset(id, b.photoRef as string | undefined)));
  app.post("/trades/:id/ship", act((id, b) => escrowService.ship(id, (b.carrier as string) || "CrownX Courier", (b.trackingNumber as string) || "CX000000")));
  app.get("/trades/:id/track", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = escrowService.track(id);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.post("/trades/:id/delivered", act((id) => escrowService.markDelivered(id)));
  app.post("/trades/:id/authenticate", act((id, b) => escrowService.authenticateReceipt(id, b.imageRef as string | undefined, typeof b.confidence === "number" ? (b.confidence as number) : undefined)));
  app.post("/trades/:id/investigate", act((id) => escrowService.investigate(id)));

  // fraud graph: connected-accounts-by-invite
  app.post("/invites", async (request, reply) => {
    const b = (request.body || {}) as { inviterId?: string; inviteeId?: string };
    if (!b.inviterId || !b.inviteeId) return reply.code(400).send({ error: "inviterId_and_inviteeId_required" });
    return escrowService.recordInvite(b.inviterId, b.inviteeId);
  });
}
