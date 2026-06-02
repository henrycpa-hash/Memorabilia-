export type DisputeType =
  | "item_not_as_described"
  | "authenticity_challenge"
  | "shipping_damage"
  | "payment_issue"
  | "seller_non_performance"
  | "buyer_non_performance";

export type DisputeStatus =
  | "open"
  | "in_review"
  | "waiting_on_parties"
  | "resolved_release"
  | "resolved_refund"
  | "resolved_split"
  | "closed";

export type Dispute = {
  id: string;
  settlementId: string;
  openedByUserId: string;
  disputeType: DisputeType;
  status: DisputeStatus;
  reason: string;
  resolutionType: "release" | "refund" | "split" | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type DisputeMessage = {
  id: string;
  disputeId: string;
  actorId: string;
  body: string;
  createdAt: string;
};

const disputes: Dispute[] = [];
const messages: DisputeMessage[] = [];

export const disputeRepo = {
  insert(d: Dispute) {
    disputes.push(d);
    return d;
  },
  findById(id: string) {
    return disputes.find((d) => d.id === id) || null;
  },
  list() {
    return [...disputes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  listForSettlement(settlementId: string) {
    return disputes.filter((d) => d.settlementId === settlementId);
  },
  update(id: string, patch: Partial<Dispute>) {
    const d = disputes.find((x) => x.id === id);
    if (d) Object.assign(d, patch);
    return d || null;
  },

  insertMessage(m: DisputeMessage) {
    messages.push(m);
    return m;
  },
  listMessages(disputeId: string) {
    return messages
      .filter((m) => m.disputeId === disputeId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
};
