import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const taxRemittanceBase = () => process.env.TAX_REMITTANCE_SERVICE_URL || "http://localhost:4061";

export type RailType = "ach" | "wire" | "sepa" | "bacs" | "regulator_portal" | "manual_check";

export type RailProvider =
  | "stripe_treasury"
  | "modulr"
  | "currencycloud"
  | "wise_business"
  | "regulator_native"
  | "manual";

export type RailStatus = "active" | "degraded" | "suspended" | "decommissioned";

export type SubmissionStatus =
  | "queued"
  | "submitting"
  | "submitted"
  | "acknowledged"
  | "rejected"
  | "failed"
  | "reconciled";

export type ReceiptType = "submission_ack" | "payment_confirmation" | "filing_receipt" | "rejection_notice";

/** Per-jurisdiction remittance rail registry. */
export type RemittanceRail = {
  id: string;
  jurisdictionKey: string;
  railType: RailType;
  provider: RailProvider;
  status: RailStatus;
  /** Free-form provider config (creds reference, endpoint, etc.). */
  config: Record<string, unknown>;
  /** Idempotency window in seconds for retry dedup. */
  idempotencyWindowSeconds: number;
  createdAt: string;
};

export type RailSubmission = {
  id: string;
  obligationId: string;
  /** Remittance run from tax-remittance-service this submission was raised against. */
  upstreamRemittanceRunId: string | null;
  railId: string;
  jurisdictionKey: string;
  externalSubmissionRef: string | null;
  status: SubmissionStatus;
  amountCents: number;
  receiptUri: string | null;
  failureReason: string | null;
  /** Idempotency key — caller-supplied or derived from obligation+amount. */
  idempotencyKey: string;
  /** Number of retry attempts so far. */
  retryAttempts: number;
  createdAt: string;
  completedAt: string | null;
};

export type RailReceipt = {
  id: string;
  submissionId: string;
  receiptType: ReceiptType;
  payload: Record<string, unknown>;
  createdAt: string;
};

const rails: RemittanceRail[] = [];
const submissions: RailSubmission[] = [];
const receipts: RailReceipt[] = [];

/** Seed common rails on boot. */
function seed() {
  if (rails.length > 0) return;
  const seeds: Array<Omit<RemittanceRail, "id" | "createdAt">> = [
    { jurisdictionKey: "US-FED", railType: "ach", provider: "stripe_treasury", status: "active", config: { settlement_window: "T+2" }, idempotencyWindowSeconds: 86400 },
    { jurisdictionKey: "US-FED", railType: "wire", provider: "stripe_treasury", status: "active", config: { settlement_window: "same_day" }, idempotencyWindowSeconds: 3600 },
    { jurisdictionKey: "GB", railType: "bacs", provider: "modulr", status: "active", config: { settlement_window: "T+3" }, idempotencyWindowSeconds: 86400 },
    { jurisdictionKey: "GB", railType: "regulator_portal", provider: "regulator_native", status: "active", config: { regulator: "hmrc" }, idempotencyWindowSeconds: 0 },
    { jurisdictionKey: "DE", railType: "sepa", provider: "currencycloud", status: "active", config: { settlement_window: "T+1" }, idempotencyWindowSeconds: 86400 },
    { jurisdictionKey: "FR", railType: "sepa", provider: "currencycloud", status: "active", config: { settlement_window: "T+1" }, idempotencyWindowSeconds: 86400 },
    { jurisdictionKey: "EU", railType: "sepa", provider: "wise_business", status: "active", config: { settlement_window: "T+1" }, idempotencyWindowSeconds: 86400 }
  ];
  for (const s of seeds) {
    rails.push({ id: newId(), createdAt: nowIso(), ...s });
  }
}
seed();

/** Pick the best rail for a (jurisdiction, railType). Falls back across types. */
export function selectRail(jurisdictionKey: string, preferred?: RailType): RemittanceRail | null {
  const active = rails.filter((r) => r.jurisdictionKey === jurisdictionKey && r.status === "active");
  if (preferred) {
    const exact = active.find((r) => r.railType === preferred);
    if (exact) return exact;
  }
  return active[0] || null;
}

async function postOk<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const railConnectorService = {
  async createRail(input: Omit<RemittanceRail, "id" | "createdAt">): Promise<RemittanceRail> {
    const r: RemittanceRail = { id: newId(), createdAt: nowIso(), ...input };
    rails.push(r);
    return r;
  },

  setRailStatus(id: string, status: RailStatus) {
    const r = rails.find((x) => x.id === id);
    if (!r) return null;
    r.status = status;
    return r;
  },

  /**
   * Submit to an external rail. Wave 11 simulates rail call; Wave 12 swaps in
   * jurisdiction-rail-adapters-service. Idempotency: if a submission with the
   * same idempotencyKey exists in the rail's window, return that one.
   */
  async submit(input: {
    obligationId: string;
    upstreamRemittanceRunId?: string;
    jurisdictionKey: string;
    railType?: RailType;
    amountCents: number;
    idempotencyKey?: string;
  }): Promise<RailSubmission | null> {
    const rail = selectRail(input.jurisdictionKey, input.railType);
    if (!rail) return null;

    const key = input.idempotencyKey || `${input.obligationId}:${input.amountCents}`;

    // Idempotency check — return existing in-window submission if present
    const windowMs = rail.idempotencyWindowSeconds * 1000;
    if (windowMs > 0) {
      const cutoff = Date.now() - windowMs;
      const existing = submissions.find((s) =>
        s.idempotencyKey === key
        && s.railId === rail.id
        && new Date(s.createdAt).getTime() >= cutoff
      );
      if (existing) return existing;
    }

    const sub: RailSubmission = {
      id: newId(),
      obligationId: input.obligationId,
      upstreamRemittanceRunId: input.upstreamRemittanceRunId || null,
      railId: rail.id,
      jurisdictionKey: input.jurisdictionKey,
      externalSubmissionRef: null,
      status: "submitting",
      amountCents: input.amountCents,
      receiptUri: null,
      failureReason: null,
      idempotencyKey: key,
      retryAttempts: 0,
      createdAt: nowIso(),
      completedAt: null
    };
    submissions.push(sub);

    // Simulate provider call — generates provider-style ref
    sub.externalSubmissionRef = `${rail.provider}_${sub.id.slice(0, 12)}`;
    sub.status = "submitted";

    // Generate submission_ack receipt
    const ack: RailReceipt = {
      id: newId(),
      submissionId: sub.id,
      receiptType: "submission_ack",
      payload: { externalRef: sub.externalSubmissionRef, provider: rail.provider, jurisdictionKey: rail.jurisdictionKey, amountCents: sub.amountCents },
      createdAt: nowIso()
    };
    receipts.push(ack);

    await publishOutbox({
      id: newId(),
      eventType: "rail.submission.submitted",
      aggregateId: sub.id,
      aggregateType: "rail_submission",
      payload: { id: sub.id, railId: rail.id, externalRef: sub.externalSubmissionRef, jurisdictionKey: sub.jurisdictionKey, amountCents: sub.amountCents },
      occurredAt: nowIso()
    });

    return sub;
  },

  /**
   * Acknowledge a submission and capture the payment-confirmation receipt.
   * On reconciliation we POST to upstream tax-remittance-service if linked.
   */
  async acknowledge(input: { submissionId: string; receiptUri?: string; payload?: Record<string, unknown> }): Promise<RailSubmission | null> {
    const sub = submissions.find((s) => s.id === input.submissionId);
    if (!sub) return null;
    if (sub.status !== "submitted") return sub;
    sub.status = "acknowledged";
    sub.receiptUri = input.receiptUri || `s3://crownx-rail-receipts/${sub.id}/payment_confirmation.json`;
    receipts.push({
      id: newId(),
      submissionId: sub.id,
      receiptType: "payment_confirmation",
      payload: input.payload || { acknowledgedAt: nowIso() },
      createdAt: nowIso()
    });
    await publishOutbox({
      id: newId(),
      eventType: "rail.submission.acknowledged",
      aggregateId: sub.id,
      aggregateType: "rail_submission",
      payload: { id: sub.id, externalRef: sub.externalSubmissionRef, receiptUri: sub.receiptUri },
      occurredAt: nowIso()
    });
    return sub;
  },

  /**
   * Reconcile a submission to upstream tax-remittance-service. Best-effort
   * upstream POST; status flips to reconciled regardless so caller can retry.
   */
  async reconcile(submissionId: string): Promise<RailSubmission | null> {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return null;
    if (sub.status !== "acknowledged") return sub;
    if (sub.upstreamRemittanceRunId) {
      await postOk(`${taxRemittanceBase()}/tax/remittances/${sub.upstreamRemittanceRunId}/acknowledge`, {});
    }
    sub.status = "reconciled";
    sub.completedAt = nowIso();
    return sub;
  },

  async fail(input: { submissionId: string; reason: string; allowRetry?: boolean }): Promise<RailSubmission | null> {
    const sub = submissions.find((s) => s.id === input.submissionId);
    if (!sub) return null;
    sub.status = input.allowRetry ? "queued" : "failed";
    sub.failureReason = input.reason;
    if (input.allowRetry) sub.retryAttempts += 1;
    receipts.push({
      id: newId(),
      submissionId: sub.id,
      receiptType: "rejection_notice",
      payload: { reason: input.reason, allowRetry: !!input.allowRetry, attempt: sub.retryAttempts },
      createdAt: nowIso()
    });
    await publishOutbox({
      id: newId(),
      eventType: "rail.submission.failed",
      aggregateId: sub.id,
      aggregateType: "rail_submission",
      payload: { id: sub.id, reason: input.reason, retryAttempts: sub.retryAttempts },
      occurredAt: nowIso()
    });
    return sub;
  },

  /** Retry a previously failed submission. Idempotency key is reused. */
  async retry(submissionId: string): Promise<RailSubmission | null> {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return null;
    if (sub.status !== "queued") return sub;
    sub.status = "submitting";
    sub.failureReason = null;
    sub.externalSubmissionRef = `retry_${sub.id.slice(0, 12)}_${sub.retryAttempts}`;
    sub.status = "submitted";
    return sub;
  },

  // Read APIs
  listRails: (jurisdictionKey?: string) => rails.filter((r) => !jurisdictionKey || r.jurisdictionKey === jurisdictionKey),
  findRail: (id: string) => rails.find((r) => r.id === id) || null,
  listSubmissions: (status?: SubmissionStatus, jurisdictionKey?: string) =>
    submissions
      .filter((s) => (!status || s.status === status) && (!jurisdictionKey || s.jurisdictionKey === jurisdictionKey))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findSubmission: (id: string) => submissions.find((s) => s.id === id) || null,
  receiptsForSubmission: (id: string) => receipts.filter((r) => r.submissionId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  pipelineSummary() {
    const byStatus: Record<SubmissionStatus, number> = {
      queued: 0, submitting: 0, submitted: 0, acknowledged: 0, rejected: 0, failed: 0, reconciled: 0
    };
    let totalCents = 0;
    for (const s of submissions) {
      byStatus[s.status]++;
      if (s.status === "reconciled" || s.status === "acknowledged") totalCents += s.amountCents;
    }
    return { totalRails: rails.length, totalSubmissions: submissions.length, byStatus, totalReconciledCents: totalCents };
  }
};
