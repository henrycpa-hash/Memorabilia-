import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  pickIntentAdapter,
  pickPayoutAdapter,
  type PaymentProvider,
  type PaymentIntentStatus
} from "@crownx-jewel/shared-payments";
import {
  paymentRepo,
  type PaymentIntent,
  type PayoutRecord
} from "../repo/payment.repo";

function fmt(n: number): string {
  return n.toFixed(2);
}

async function logEvent(
  paymentIntentId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  paymentRepo.insertEvent({
    id: newId(),
    paymentIntentId,
    eventType,
    payloadJson: payload,
    createdAt: nowIso()
  });
}

export const paymentService = {
  async createIntent(input: {
    settlementId: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
    paymentMethodType: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    const adapter = pickIntentAdapter(input.provider);
    const result = await adapter.createIntent({
      amount: input.amount,
      currency: input.currency,
      metadata: { settlementId: input.settlementId, ...(input.metadata || {}) }
    });
    const intent: PaymentIntent = {
      id: newId(),
      settlementId: input.settlementId,
      provider: input.provider,
      providerIntentId: result.providerIntentId,
      amount: fmt(input.amount),
      currency: input.currency,
      status: result.status,
      paymentMethodType: input.paymentMethodType,
      clientSecret: result.clientSecret || null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    paymentRepo.insertIntent(intent);
    await logEvent(intent.id, "intent.created", {
      provider: input.provider,
      amount: intent.amount
    });
    await publishOutbox({
      id: newId(),
      eventType: "payment.intent.created",
      aggregateId: intent.id,
      aggregateType: "payment_intent",
      payload: intent,
      occurredAt: nowIso()
    });
    return intent;
  },

  async captureIntent(id: string): Promise<PaymentIntent | null> {
    const intent = paymentRepo.findIntent(id);
    if (!intent) return null;
    const adapter = pickIntentAdapter(intent.provider);
    const result = await adapter.captureIntent({
      providerIntentId: intent.providerIntentId
    });
    const updated = paymentRepo.updateIntent(id, {
      status: result.status,
      updatedAt: nowIso()
    });
    if (updated) {
      await logEvent(updated.id, "intent.captured", { status: result.status });
      await publishOutbox({
        id: newId(),
        eventType: "payment.intent.captured",
        aggregateId: updated.id,
        aggregateType: "payment_intent",
        payload: updated,
        occurredAt: nowIso()
      });
    }
    return updated;
  },

  async refundIntent(id: string, amount?: number): Promise<PaymentIntent | null> {
    const intent = paymentRepo.findIntent(id);
    if (!intent) return null;
    const adapter = pickIntentAdapter(intent.provider);
    const result = await adapter.refundIntent({
      providerIntentId: intent.providerIntentId,
      amount
    });
    const updated = paymentRepo.updateIntent(id, {
      status: result.status,
      updatedAt: nowIso()
    });
    if (updated) {
      await logEvent(updated.id, "intent.refunded", { status: result.status, amount });
      await publishOutbox({
        id: newId(),
        eventType: "payment.intent.refunded",
        aggregateId: updated.id,
        aggregateType: "payment_intent",
        payload: updated,
        occurredAt: nowIso()
      });
    }
    return updated;
  },

  async voidIntent(id: string): Promise<PaymentIntent | null> {
    const intent = paymentRepo.findIntent(id);
    if (!intent) return null;
    const adapter = pickIntentAdapter(intent.provider);
    const result = await adapter.voidIntent({
      providerIntentId: intent.providerIntentId
    });
    const updated = paymentRepo.updateIntent(id, {
      status: result.status,
      updatedAt: nowIso()
    });
    if (updated) {
      await logEvent(updated.id, "intent.voided", { status: result.status });
    }
    return updated;
  },

  async initiatePayout(input: {
    settlementId: string;
    payeeId: string;
    amount: number;
    currency: string;
    provider: PaymentProvider;
    metadata?: Record<string, unknown>;
  }): Promise<PayoutRecord> {
    const adapter = pickPayoutAdapter(input.provider);
    const result = await adapter.initiatePayout({
      destinationRef: input.payeeId,
      amount: input.amount,
      currency: input.currency,
      metadata: input.metadata
    });
    const payout: PayoutRecord = {
      id: newId(),
      settlementId: input.settlementId,
      payeeId: input.payeeId,
      amount: fmt(input.amount),
      currency: input.currency,
      provider: input.provider,
      providerPayoutId: result.providerPayoutId,
      status: result.status,
      createdAt: nowIso()
    };
    paymentRepo.insertPayout(payout);
    await publishOutbox({
      id: newId(),
      eventType: "payment.payout.initiated",
      aggregateId: payout.id,
      aggregateType: "payout",
      payload: payout,
      occurredAt: nowIso()
    });
    return payout;
  },

  async markPayoutPaid(id: string): Promise<PayoutRecord | null> {
    const updated = paymentRepo.updatePayout(id, { status: "paid" });
    if (updated) {
      await publishOutbox({
        id: newId(),
        eventType: "payment.payout.paid",
        aggregateId: updated.id,
        aggregateType: "payout",
        payload: updated,
        occurredAt: nowIso()
      });
    }
    return updated;
  },

  findIntent: (id: string) => paymentRepo.findIntent(id),
  listIntents: () => paymentRepo.listIntents(),
  listIntentEvents: (id: string) => paymentRepo.listEvents(id),
  listPayouts: () => paymentRepo.listPayouts(),
  payoutsForSettlement: (s: string) => paymentRepo.payoutsForSettlement(s),
  intentsForSettlement: (s: string) => paymentRepo.findBySettlement(s)
};

export type { PaymentIntent, PaymentIntentStatus };
