import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  disputeRepo,
  type Dispute,
  type DisputeMessage,
  type DisputeType
} from "../repo/dispute.repo";

const settlementBase = () =>
  process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";

export const disputeService = {
  async open(input: {
    settlementId: string;
    openedByUserId: string;
    disputeType: DisputeType;
    reason: string;
  }): Promise<Dispute> {
    const d: Dispute = {
      id: newId(),
      settlementId: input.settlementId,
      openedByUserId: input.openedByUserId,
      disputeType: input.disputeType,
      status: "open",
      reason: input.reason,
      resolutionType: null,
      createdAt: nowIso(),
      resolvedAt: null
    };
    disputeRepo.insert(d);

    // Settlement service hold (best-effort, never fail-the-call)
    try {
      await fetch(`${settlementBase()}/internal/settlements/${input.settlementId}/hold`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: `Dispute: ${input.disputeType}` })
      });
    } catch {
      // logged elsewhere; the dispute itself is durable
    }

    await publishOutbox({
      id: newId(),
      eventType: "dispute.opened",
      aggregateId: d.id,
      aggregateType: "dispute",
      payload: {
        disputeId: d.id,
        settlementId: d.settlementId,
        disputeType: d.disputeType
      },
      occurredAt: nowIso()
    });

    return d;
  },

  async addMessage(input: {
    disputeId: string;
    actorId: string;
    body: string;
  }): Promise<DisputeMessage> {
    const m: DisputeMessage = {
      id: newId(),
      disputeId: input.disputeId,
      actorId: input.actorId,
      body: input.body,
      createdAt: nowIso()
    };
    disputeRepo.insertMessage(m);
    return m;
  },

  async resolve(input: {
    disputeId: string;
    resolutionType: "release" | "refund" | "split";
    actorId: string;
  }): Promise<Dispute | null> {
    const d = disputeRepo.update(input.disputeId, {
      status:
        input.resolutionType === "release"
          ? "resolved_release"
          : input.resolutionType === "refund"
            ? "resolved_refund"
            : "resolved_split",
      resolutionType: input.resolutionType,
      resolvedAt: nowIso()
    });
    if (!d) return null;

    // Reflect resolution into the settlement.
    try {
      const url =
        input.resolutionType === "refund"
          ? `${settlementBase()}/settlements/${d.settlementId}/refund`
          : `${settlementBase()}/settlements/${d.settlementId}/release`;
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: `Dispute resolution: ${input.resolutionType}` })
      });
    } catch {
      // best-effort
    }

    await publishOutbox({
      id: newId(),
      eventType: "dispute.resolved",
      aggregateId: d.id,
      aggregateType: "dispute",
      payload: { disputeId: d.id, resolutionType: input.resolutionType },
      occurredAt: nowIso()
    });

    return d;
  },

  async close(disputeId: string): Promise<Dispute | null> {
    return disputeRepo.update(disputeId, { status: "closed", resolvedAt: nowIso() });
  },

  list() {
    return disputeRepo.list();
  },
  findById(id: string) {
    return disputeRepo.findById(id);
  },
  listForSettlement(settlementId: string) {
    return disputeRepo.listForSettlement(settlementId);
  },
  messages(disputeId: string) {
    return disputeRepo.listMessages(disputeId);
  }
};
