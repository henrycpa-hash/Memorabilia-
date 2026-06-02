export type SettlementState =
  | "pending_payment"
  | "escrow_held"
  | "ready_for_release"
  | "on_hold"
  | "payout_scheduled"
  | "completed"
  | "refunded"
  | "failed";

export type EscrowState =
  | "none"
  | "held"
  | "releasable"
  | "released"
  | "refunded";

export type Settlement = {
  id: string;
  sourceType: "order" | "auction" | "accepted_offer";
  sourceId: string;
  assetId: string;
  buyerId: string;
  sellerId: string;
  grossAmount: string;
  platformFeeAmount: string;
  royaltyAmount: string;
  sellerNetAmount: string;
  escrowState: EscrowState;
  settlementState: SettlementState;
  holdReason: string | null;
  riskScore: number | null;
  riskBand: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SettlementEvent = {
  id: string;
  settlementId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const settlements: Settlement[] = [];
const events: SettlementEvent[] = [];

export const settlementRepo = {
  insert(s: Settlement) {
    settlements.push(s);
    return s;
  },
  findById(id: string) {
    return settlements.find((s) => s.id === id) || null;
  },
  list() {
    return [...settlements];
  },
  listByState(state: SettlementState) {
    return settlements.filter((s) => s.settlementState === state);
  },
  listForBuyer(buyerId: string) {
    return settlements.filter((s) => s.buyerId === buyerId);
  },
  listForSeller(sellerId: string) {
    return settlements.filter((s) => s.sellerId === sellerId);
  },
  update(id: string, patch: Partial<Settlement>) {
    const s = settlements.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
    return s || null;
  },
  insertEvent(e: SettlementEvent) {
    events.push(e);
    return e;
  },
  listEvents(settlementId: string) {
    return events
      .filter((e) => e.settlementId === settlementId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  count() {
    return settlements.length;
  }
};
