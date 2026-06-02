export type OfferStatus =
  | "submitted"
  | "countered"
  | "accepted"
  | "rejected"
  | "expired"
  | "withdrawn";

export type Offer = {
  id: string;
  assetId: string;
  listingId: string | null;
  buyerId: string;
  sellerId: string;
  amount: string;
  counterAmount: string | null;
  status: OfferStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OfferEvent = {
  id: string;
  offerId: string;
  eventType: string;
  actorId: string;
  amount: string | null;
  createdAt: string;
};

const offers: Offer[] = [];
const events: OfferEvent[] = [];

export const offerRepo = {
  insert(o: Offer) {
    offers.push(o);
    return o;
  },
  findById(id: string) {
    return offers.find((o) => o.id === id) || null;
  },
  list() {
    return [...offers];
  },
  listForAsset(assetId: string) {
    return offers.filter((o) => o.assetId === assetId);
  },
  listForBuyer(buyerId: string) {
    return offers.filter((o) => o.buyerId === buyerId);
  },
  listForSeller(sellerId: string) {
    return offers.filter((o) => o.sellerId === sellerId);
  },
  countAccepted(assetId: string) {
    return offers.filter((o) => o.assetId === assetId && o.status === "accepted").length;
  },
  update(id: string, patch: Partial<Offer>) {
    const o = offers.find((x) => x.id === id);
    if (o) Object.assign(o, patch);
    return o || null;
  },
  insertEvent(e: OfferEvent) {
    events.push(e);
    return e;
  },
  listEvents(offerId: string) {
    return events
      .filter((e) => e.offerId === offerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
};
