import type { PaymentIntentStatus, PaymentProvider } from "@crownx-jewel/shared-payments";

export type PaymentIntent = {
  id: string;
  settlementId: string;
  provider: PaymentProvider;
  providerIntentId: string;
  amount: string;
  currency: string;
  status: PaymentIntentStatus;
  paymentMethodType: string;
  clientSecret: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentEvent = {
  id: string;
  paymentIntentId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

export type PayoutRecord = {
  id: string;
  settlementId: string;
  payeeId: string;
  amount: string;
  currency: string;
  provider: PaymentProvider;
  providerPayoutId: string;
  status: "submitted" | "pending" | "paid" | "failed";
  createdAt: string;
};

const intents: PaymentIntent[] = [];
const events: PaymentEvent[] = [];
const payouts: PayoutRecord[] = [];

export const paymentRepo = {
  insertIntent(p: PaymentIntent) {
    intents.push(p);
    return p;
  },
  findIntent(id: string) {
    return intents.find((p) => p.id === id) || null;
  },
  findBySettlement(settlementId: string) {
    return intents.filter((p) => p.settlementId === settlementId);
  },
  listIntents() {
    return [...intents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  updateIntent(id: string, patch: Partial<PaymentIntent>) {
    const p = intents.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p || null;
  },

  insertEvent(e: PaymentEvent) {
    events.push(e);
    return e;
  },
  listEvents(paymentIntentId: string) {
    return events
      .filter((e) => e.paymentIntentId === paymentIntentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  insertPayout(p: PayoutRecord) {
    payouts.push(p);
    return p;
  },
  listPayouts() {
    return [...payouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  payoutsForSettlement(settlementId: string) {
    return payouts.filter((p) => p.settlementId === settlementId);
  },
  updatePayout(id: string, patch: Partial<PayoutRecord>) {
    const p = payouts.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p || null;
  }
};
