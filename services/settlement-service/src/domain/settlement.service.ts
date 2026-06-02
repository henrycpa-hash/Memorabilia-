import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { scoreRisk, shouldHoldForRisk } from "@crownx-jewel/shared-risk";
import {
  settlementRepo,
  type Settlement,
  type SettlementState,
  type EscrowState
} from "../repo/settlement.repo";

function fmt(n: number): string {
  return n.toFixed(2);
}

async function logEvent(
  settlementId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  settlementRepo.insertEvent({
    id: newId(),
    settlementId,
    eventType,
    payloadJson: payload,
    createdAt: nowIso()
  });
  await publishOutbox({
    id: newId(),
    eventType: `settlement.${eventType}`,
    aggregateId: settlementId,
    aggregateType: "settlement",
    payload: { settlementId, ...payload },
    occurredAt: nowIso()
  });
}

export const settlementService = {
  /**
   * Create a settlement record from a fixed-price sale, accepted offer, or
   * auction win. Wave 4 starts settlements in `escrow_held / pending_payment`
   * because Wave 4 has no real payment processor — the gateway treats the
   * order as already paid for demo purposes. Wave 5 adds the payment-intent
   * confirmation step that legitimately moves it to `escrow_held`.
   */
  async createFromSale(input: {
    sourceType: "order" | "auction" | "accepted_offer";
    sourceId: string;
    assetId: string;
    buyerId: string;
    sellerId: string;
    grossAmount: number;
    platformFeeAmount: number;
    royaltyAmount: number;
    sellerNetAmount: number;
    riskSignals?: string[];
  }): Promise<Settlement> {
    const risk = scoreRisk(input.riskSignals || []);
    const initialState: SettlementState = shouldHoldForRisk(risk.riskBand)
      ? "on_hold"
      : "ready_for_release";
    const escrow: EscrowState = "held";

    const s: Settlement = {
      id: newId(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      assetId: input.assetId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      grossAmount: fmt(input.grossAmount),
      platformFeeAmount: fmt(input.platformFeeAmount),
      royaltyAmount: fmt(input.royaltyAmount),
      sellerNetAmount: fmt(input.sellerNetAmount),
      escrowState: escrow,
      settlementState: initialState,
      holdReason:
        initialState === "on_hold"
          ? `risk:${risk.riskBand} (${risk.reasons.join(",")})`
          : null,
      riskScore: risk.score,
      riskBand: risk.riskBand,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    settlementRepo.insert(s);
    await logEvent(s.id, "created", {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      grossAmount: s.grossAmount,
      riskBand: risk.riskBand,
      initialState
    });
    return s;
  },

  /** Place a settlement on hold (called by dispute-service when a dispute opens). */
  async hold(settlementId: string, reason: string): Promise<Settlement | null> {
    const s = settlementRepo.update(settlementId, {
      settlementState: "on_hold",
      holdReason: reason,
      updatedAt: nowIso()
    });
    if (s) await logEvent(s.id, "held", { reason });
    return s;
  },

  /** Lift a hold and move settlement back to ready_for_release. */
  async release(settlementId: string): Promise<Settlement | null> {
    const s = settlementRepo.update(settlementId, {
      settlementState: "ready_for_release",
      holdReason: null,
      updatedAt: nowIso()
    });
    if (s) await logEvent(s.id, "released_from_hold", {});
    return s;
  },

  /** Mark the settlement scheduled for payout (called by payout release worker). */
  async schedulePayout(settlementId: string): Promise<Settlement | null> {
    const s = settlementRepo.update(settlementId, {
      settlementState: "payout_scheduled",
      escrowState: "releasable",
      updatedAt: nowIso()
    });
    if (s) await logEvent(s.id, "payout_scheduled", {});
    return s;
  },

  /** Mark the settlement fully completed (escrow released, payouts done). */
  async complete(settlementId: string): Promise<Settlement | null> {
    const s = settlementRepo.update(settlementId, {
      settlementState: "completed",
      escrowState: "released",
      updatedAt: nowIso()
    });
    if (s) await logEvent(s.id, "completed", {});
    return s;
  },

  /** Refund path (called when a dispute resolves with refund or cancel). */
  async refund(settlementId: string, reason: string): Promise<Settlement | null> {
    const s = settlementRepo.update(settlementId, {
      settlementState: "refunded",
      escrowState: "refunded",
      holdReason: reason,
      updatedAt: nowIso()
    });
    if (s) await logEvent(s.id, "refunded", { reason });
    return s;
  },

  list() {
    return settlementRepo.list();
  },
  listByState(state: SettlementState) {
    return settlementRepo.listByState(state);
  },
  findById(id: string) {
    return settlementRepo.findById(id);
  },
  events(settlementId: string) {
    return settlementRepo.listEvents(settlementId);
  },

  /**
   * Wave 4 settlement-transition worker. Looks for settlements that are
   * `ready_for_release` and not on hold, and ticks them through to
   * payout_scheduled then completed. In Wave 4 this runs in-process when the
   * worker route is poked; Wave 5 moves it to a real cron loop.
   */
  async tickReleaseWorker(): Promise<{ scheduled: number; completed: number }> {
    let scheduled = 0;
    let completed = 0;
    for (const s of settlementRepo.listByState("ready_for_release")) {
      await this.schedulePayout(s.id);
      scheduled += 1;
    }
    for (const s of settlementRepo.listByState("payout_scheduled")) {
      await this.complete(s.id);
      completed += 1;
    }
    return { scheduled, completed };
  }
};
