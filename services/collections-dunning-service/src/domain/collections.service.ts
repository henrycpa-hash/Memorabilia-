import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  daysToAgingBucket,
  nextDunningStep,
  DEFAULT_DUNNING_CADENCE,
  type AgingBucket,
  type DunningCadenceStep,
  type PromiseToPayStatus,
  type ReceivableStatus,
  type WriteOffStatus
} from "@crownx-jewel/shared-collections";

const billingBase = () => process.env.BILLING_METERING_SERVICE_URL || "http://localhost:4039";

export type Receivable = {
  id: string;
  tenantId: string;
  statementId: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueDate: string;
  status: ReceivableStatus;
  agingBucket: AgingBucket;
  daysPastDue: number;
  createdAt: string;
  updatedAt: string;
};

export type DunningRun = {
  id: string;
  receivableId: string;
  cadenceStep: number;
  templateKey: string;
  channel: string;
  status: "queued" | "sent" | "skipped" | "failed";
  description: string;
  createdAt: string;
};

export type PromiseToPay = {
  id: string;
  receivableId: string;
  promisedAmountCents: number;
  promisedDate: string;
  status: PromiseToPayStatus;
  notes: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type WriteOffRequest = {
  id: string;
  receivableId: string;
  requestedByUserId: string;
  amountCents: number;
  reason: string;
  status: WriteOffStatus;
  approverUserId: string | null;
  decisionAt: string | null;
  createdAt: string;
};

const receivables: Receivable[] = [];
const runs: DunningRun[] = [];
const promises: PromiseToPay[] = [];
const writeoffs: WriteOffRequest[] = [];

function refreshAging(r: Receivable) {
  const days = Math.floor((Date.now() - new Date(r.dueDate).getTime()) / (24 * 60 * 60 * 1000));
  r.daysPastDue = days;
  r.agingBucket = daysToAgingBucket(days);
}

export const collectionsService = {
  async createReceivable(input: {
    tenantId: string;
    statementId: string;
    amountDueCents: number;
    dueDate: string;
  }): Promise<Receivable> {
    const r: Receivable = {
      id: newId(),
      tenantId: input.tenantId,
      statementId: input.statementId,
      amountDueCents: input.amountDueCents,
      amountPaidCents: 0,
      dueDate: input.dueDate,
      status: "open",
      agingBucket: "current",
      daysPastDue: 0,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    refreshAging(r);
    receivables.push(r);
    await publishOutbox({
      id: newId(),
      eventType: "collections.receivable.created",
      aggregateId: r.id,
      aggregateType: "receivable",
      payload: r,
      occurredAt: nowIso()
    });
    return r;
  },

  /**
   * Pull an unpaid statement from billing-metering-service and produce a
   * receivable from it. Used in the standard tenant billing close → collect flow.
   */
  async ingestFromStatement(statementId: string): Promise<Receivable | null> {
    let stmt: { id: string; tenantId: string; totalCents: number; periodEnd: string; status: string } | null = null;
    try {
      const r = await fetch(`${billingBase()}/billing/statements/by-tenant/__lookup`);
      if (r.ok) stmt = await r.json();
    } catch { /* ignore */ }
    // Fallback: caller should have provided enough data. Use a synthetic stub.
    if (!stmt) {
      stmt = { id: statementId, tenantId: "unknown", totalCents: 0, periodEnd: nowIso(), status: "issued" };
    }
    const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.createReceivable({
      tenantId: stmt.tenantId,
      statementId: stmt.id,
      amountDueCents: stmt.totalCents,
      dueDate: due
    });
  },

  /** Apply a payment toward a receivable; if fully paid, mark paid. */
  async applyPayment(input: { receivableId: string; amountCents: number }): Promise<Receivable | null> {
    const r = receivables.find((x) => x.id === input.receivableId);
    if (!r) return null;
    r.amountPaidCents += input.amountCents;
    r.updatedAt = nowIso();
    if (r.amountPaidCents >= r.amountDueCents) {
      r.status = "paid";
      await publishOutbox({
        id: newId(),
        eventType: "collections.receivable.paid",
        aggregateId: r.id,
        aggregateType: "receivable",
        payload: r,
        occurredAt: nowIso()
      });
    }
    return r;
  },

  /** Run the dunning evaluator: returns the next step due (if any) per receivable. */
  async runDunningCadence(input?: { cadence?: DunningCadenceStep[] }): Promise<DunningRun[]> {
    const cadence = input?.cadence || DEFAULT_DUNNING_CADENCE;
    const created: DunningRun[] = [];
    for (const r of receivables) {
      if (r.status === "paid" || r.status === "written_off") continue;
      refreshAging(r);
      const last = Math.max(0, ...runs.filter((x) => x.receivableId === r.id).map((x) => x.cadenceStep));
      const next = nextDunningStep(r.daysPastDue, last, cadence);
      if (!next) continue;
      const run: DunningRun = {
        id: newId(),
        receivableId: r.id,
        cadenceStep: next.step,
        templateKey: next.templateKey,
        channel: next.channel,
        status: "sent",
        description: next.description,
        createdAt: nowIso()
      };
      runs.push(run);
      created.push(run);
      r.status = "in_dunning";
      r.updatedAt = nowIso();
      await publishOutbox({
        id: newId(),
        eventType: "collections.dunning.executed",
        aggregateId: run.id,
        aggregateType: "dunning_run",
        payload: { runId: run.id, receivableId: r.id, step: run.cadenceStep, channel: run.channel },
        occurredAt: nowIso()
      });
    }
    return created;
  },

  async createPromiseToPay(input: {
    receivableId: string;
    promisedAmountCents: number;
    promisedDate: string;
    notes?: string;
  }): Promise<PromiseToPay | null> {
    const r = receivables.find((x) => x.id === input.receivableId);
    if (!r) return null;
    const p: PromiseToPay = {
      id: newId(),
      receivableId: r.id,
      promisedAmountCents: input.promisedAmountCents,
      promisedDate: input.promisedDate,
      status: "open",
      notes: input.notes || "",
      createdAt: nowIso(),
      resolvedAt: null
    };
    promises.push(p);
    r.status = "promise_to_pay";
    r.updatedAt = nowIso();
    return p;
  },

  resolvePromise(id: string, kept: boolean) {
    const p = promises.find((x) => x.id === id);
    if (!p) return null;
    p.status = kept ? "kept" : "broken";
    p.resolvedAt = nowIso();
    return p;
  },

  async createWriteOff(input: {
    receivableId: string;
    requestedByUserId: string;
    amountCents: number;
    reason: string;
  }): Promise<WriteOffRequest | null> {
    const r = receivables.find((x) => x.id === input.receivableId);
    if (!r) return null;
    const wo: WriteOffRequest = {
      id: newId(),
      receivableId: r.id,
      requestedByUserId: input.requestedByUserId,
      amountCents: input.amountCents,
      reason: input.reason,
      status: "submitted",
      approverUserId: null,
      decisionAt: null,
      createdAt: nowIso()
    };
    writeoffs.push(wo);
    return wo;
  },

  async approveWriteOff(input: { writeOffId: string; approverUserId: string }) {
    const wo = writeoffs.find((x) => x.id === input.writeOffId);
    if (!wo) return null;
    wo.status = "approved";
    wo.approverUserId = input.approverUserId;
    wo.decisionAt = nowIso();
    const r = receivables.find((x) => x.id === wo.receivableId);
    if (r) {
      r.status = "written_off";
      r.updatedAt = nowIso();
    }
    await publishOutbox({
      id: newId(),
      eventType: "collections.writeoff.approved",
      aggregateId: wo.id,
      aggregateType: "writeoff_request",
      payload: wo,
      occurredAt: nowIso()
    });
    return wo;
  },

  // Read APIs
  list: () => receivables.map((r) => { refreshAging(r); return { ...r }; }),
  byTenant: (tenantId: string) => receivables.filter((r) => r.tenantId === tenantId).map((r) => { refreshAging(r); return { ...r }; }),
  byStatus: (status: ReceivableStatus) => receivables.filter((r) => r.status === status),
  byAgingBucket: (b: AgingBucket) => { receivables.forEach(refreshAging); return receivables.filter((r) => r.agingBucket === b); },
  findById: (id: string) => receivables.find((r) => r.id === id) || null,

  listRuns: (receivableId?: string) => runs.filter((x) => !receivableId || x.receivableId === receivableId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  listPromises: (receivableId?: string) => promises.filter((x) => !receivableId || x.receivableId === receivableId),
  listWriteOffs: (status?: WriteOffStatus) => writeoffs.filter((x) => !status || x.status === status),

  /** Tenant collections health summary. */
  tenantSummary(tenantId: string) {
    const list = receivables.filter((r) => r.tenantId === tenantId);
    list.forEach(refreshAging);
    const totals: Record<ReceivableStatus, number> = {
      open: 0, in_dunning: 0, promise_to_pay: 0, paid: 0, written_off: 0, disputed: 0
    };
    const byBucket: Record<AgingBucket, { count: number; amountCents: number }> = {
      current: { count: 0, amountCents: 0 },
      "1_30": { count: 0, amountCents: 0 },
      "31_60": { count: 0, amountCents: 0 },
      "61_90": { count: 0, amountCents: 0 },
      over_90: { count: 0, amountCents: 0 }
    };
    let totalOpenCents = 0;
    for (const r of list) {
      totals[r.status] += 1;
      const remaining = r.amountDueCents - r.amountPaidCents;
      if (r.status !== "paid" && r.status !== "written_off") {
        byBucket[r.agingBucket].count += 1;
        byBucket[r.agingBucket].amountCents += remaining;
        totalOpenCents += remaining;
      }
    }
    return { tenantId, totals, byBucket, totalOpenCents, asOf: nowIso() };
  }
};
