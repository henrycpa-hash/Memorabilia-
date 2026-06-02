import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { offerRepo, type Offer } from "../repo/offer.repo";

function fmt(n: number): string {
  return n.toFixed(2);
}

async function emit(eventType: string, offer: Offer, extra: Record<string, unknown> = {}) {
  await publishOutbox({
    id: newId(),
    eventType,
    aggregateId: offer.id,
    aggregateType: "offer",
    payload: { offerId: offer.id, assetId: offer.assetId, ...extra },
    occurredAt: nowIso()
  });
}

export const offerService = {
  async submit(input: {
    assetId: string;
    listingId?: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    expiresAt?: string;
  }): Promise<Offer> {
    const offer: Offer = {
      id: newId(),
      assetId: input.assetId,
      listingId: input.listingId ?? null,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      amount: fmt(input.amount),
      counterAmount: null,
      status: "submitted",
      expiresAt: input.expiresAt ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    offerRepo.insert(offer);
    offerRepo.insertEvent({
      id: newId(),
      offerId: offer.id,
      eventType: "submitted",
      actorId: offer.buyerId,
      amount: offer.amount,
      createdAt: nowIso()
    });
    await emit("offer.submitted", offer);
    return offer;
  },

  async counter(input: { offerId: string; sellerId: string; amount: number }): Promise<Offer> {
    const offer = offerRepo.findById(input.offerId);
    if (!offer) throw new Error("offer_not_found");
    if (offer.sellerId !== input.sellerId) throw new Error("not_seller");
    if (!["submitted", "countered"].includes(offer.status)) {
      throw new Error("offer_not_open_for_counter");
    }
    const updated = offerRepo.update(offer.id, {
      counterAmount: fmt(input.amount),
      status: "countered",
      updatedAt: nowIso()
    });
    if (!updated) throw new Error("offer_not_found");
    offerRepo.insertEvent({
      id: newId(),
      offerId: updated.id,
      eventType: "countered",
      actorId: input.sellerId,
      amount: updated.counterAmount,
      createdAt: nowIso()
    });
    await emit("offer.countered", updated, { counterAmount: updated.counterAmount });
    return updated;
  },

  async accept(input: { offerId: string; actorId: string }): Promise<Offer> {
    const offer = offerRepo.findById(input.offerId);
    if (!offer) throw new Error("offer_not_found");

    // Either party (the seller accepting the buyer's submitted offer, or the
    // buyer accepting a seller counter) can land here.
    const isSeller = offer.sellerId === input.actorId;
    const isBuyer = offer.buyerId === input.actorId;
    if (!isSeller && !isBuyer) throw new Error("not_party_to_offer");

    if (isSeller && !["submitted"].includes(offer.status)) {
      throw new Error("offer_not_acceptable_by_seller");
    }
    if (isBuyer && !["countered"].includes(offer.status)) {
      throw new Error("offer_not_acceptable_by_buyer");
    }

    const updated = offerRepo.update(offer.id, {
      status: "accepted",
      updatedAt: nowIso()
    });
    if (!updated) throw new Error("offer_not_found");
    offerRepo.insertEvent({
      id: newId(),
      offerId: updated.id,
      eventType: "accepted",
      actorId: input.actorId,
      amount: updated.counterAmount ?? updated.amount,
      createdAt: nowIso()
    });
    await emit("offer.accepted", updated, {
      finalAmount: updated.counterAmount ?? updated.amount
    });
    return updated;
  },

  async reject(input: { offerId: string; actorId: string }): Promise<Offer> {
    const offer = offerRepo.findById(input.offerId);
    if (!offer) throw new Error("offer_not_found");
    if (offer.sellerId !== input.actorId && offer.buyerId !== input.actorId) {
      throw new Error("not_party_to_offer");
    }
    const updated = offerRepo.update(offer.id, {
      status: "rejected",
      updatedAt: nowIso()
    });
    if (!updated) throw new Error("offer_not_found");
    offerRepo.insertEvent({
      id: newId(),
      offerId: updated.id,
      eventType: "rejected",
      actorId: input.actorId,
      amount: null,
      createdAt: nowIso()
    });
    await emit("offer.rejected", updated);
    return updated;
  },

  list() {
    return offerRepo.list();
  },

  listForAsset(assetId: string) {
    return offerRepo.listForAsset(assetId);
  },

  listForBuyer(buyerId: string) {
    return offerRepo.listForBuyer(buyerId);
  },

  listForSeller(sellerId: string) {
    return offerRepo.listForSeller(sellerId);
  },

  countAccepted(assetId: string) {
    return offerRepo.countAccepted(assetId);
  },

  events(offerId: string) {
    return offerRepo.listEvents(offerId);
  }
};
