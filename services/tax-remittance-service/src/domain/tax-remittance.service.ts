import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { computeFilingDeadline, periodKeyForDate, type FilingPeriodKey } from "@crownx-jewel/shared-regulatory";

const taxBase = () => process.env.TAX_LOCALIZATION_SERVICE_URL || "http://localhost:4054";
const regulatoryBase = () => process.env.REGULATORY_FILING_SERVICE_URL || "http://localhost:4058";

export type TaxObligationType = "vat_filing" | "withholding_remit" | "sales_tax_filing" | "1099_remit" | "annual_summary";

export type TaxObligationStatus =
  | "open"
  | "filing_in_progress"
  | "ready_to_remit"
  | "remitted"
  | "overdue"
  | "exception"
  | "closed";

export type RemittanceRunStatus =
  | "queued"
  | "submitting"
  | "submitted"
  | "acknowledged"
  | "rejected"
  | "failed"
  | "exception";

export type TaxObligation = {
  id: string;
  jurisdictionKey: string;
  jurisdictionId: string | null;
  obligationType: TaxObligationType;
  periodKey: FilingPeriodKey;
  periodEnd: string;
  dueDate: string;
  status: TaxObligationStatus;
  /** Total tax due in cents, computed from upstream determinations or supplied directly. */
  amountDueCents: number;
  payload: Record<string, unknown>;
  /** Linked filing run from regulatory-filing-service if assembled. */
  linkedFilingRunId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RemittanceRun = {
  id: string;
  obligationId: string;
  jurisdictionKey: string;
  status: RemittanceRunStatus;
  amountCents: number;
  /** Submission reference returned by the rail (Wave 11 wires real connector). */
  rail: "manual" | "ach" | "wire" | "sepa" | "regulator_portal";
  submissionRef: string | null;
  paymentEvidenceUri: string | null;
  outputUri: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type RemittanceException = {
  id: string;
  remittanceRunId: string;
  reason: string;
  /** Suggested next action — retry, escalate, manual_review. */
  nextAction: "retry" | "escalate" | "manual_review";
  resolvedAt: string | null;
  createdAt: string;
};

const obligations: TaxObligation[] = [];
const runs: RemittanceRun[] = [];
const exceptions: RemittanceException[] = [];

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const taxRemittanceService = {
  async createObligation(input: {
    jurisdictionKey: string;
    obligationType: TaxObligationType;
    periodEnd: string;
    amountDueCents: number;
    deadlineDaysAfterPeriodEnd?: number;
    periodType?: "monthly" | "quarterly" | "annual";
    payload?: Record<string, unknown>;
  }): Promise<TaxObligation> {
    // Resolve jurisdiction if available from tax-localization
    let jurisdictionId: string | null = null;
    const jur = await fetchOk<{ id: string }>(`${taxBase()}/tax/jurisdictions/by-country/${input.jurisdictionKey.split("-")[0]}`);
    if (jur) jurisdictionId = jur.id;

    const periodType = input.periodType || "quarterly";
    const periodKey = periodKeyForDate(new Date(input.periodEnd), periodType);
    const dueDate = computeFilingDeadline(input.periodEnd, {
      requiredLineItems: [],
      periodType,
      deadlineDaysAfterPeriodEnd: input.deadlineDaysAfterPeriodEnd ?? 30,
      outputFormat: "csv"
    });

    const o: TaxObligation = {
      id: newId(),
      jurisdictionKey: input.jurisdictionKey,
      jurisdictionId,
      obligationType: input.obligationType,
      periodKey,
      periodEnd: input.periodEnd,
      dueDate,
      status: "open",
      amountDueCents: input.amountDueCents,
      payload: input.payload || {},
      linkedFilingRunId: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    obligations.push(o);
    await publishOutbox({
      id: newId(),
      eventType: "tax.obligation.created",
      aggregateId: o.id,
      aggregateType: "tax_obligation",
      payload: { id: o.id, jurisdictionKey: o.jurisdictionKey, obligationType: o.obligationType, periodKey: o.periodKey, dueDate: o.dueDate },
      occurredAt: nowIso()
    });
    return o;
  },

  setObligationStatus(id: string, status: TaxObligationStatus) {
    const o = obligations.find((x) => x.id === id);
    if (!o) return null;
    o.status = status;
    o.updatedAt = nowIso();
    return o;
  },

  /** Link an obligation to a regulatory-filing-service run. */
  linkFilingRun(obligationId: string, filingRunId: string) {
    const o = obligations.find((x) => x.id === obligationId);
    if (!o) return null;
    o.linkedFilingRunId = filingRunId;
    o.status = "filing_in_progress";
    o.updatedAt = nowIso();
    return o;
  },

  /** Mark obligation ready to remit (filing assembled, awaiting remittance). */
  markReadyToRemit(obligationId: string) {
    const o = obligations.find((x) => x.id === obligationId);
    if (!o) return null;
    o.status = "ready_to_remit";
    o.updatedAt = nowIso();
    return o;
  },

  async startRemittance(input: {
    obligationId: string;
    rail?: RemittanceRun["rail"];
    amountCents?: number;
  }): Promise<RemittanceRun | null> {
    const o = obligations.find((x) => x.id === input.obligationId);
    if (!o) return null;
    if (o.status !== "ready_to_remit" && o.status !== "exception") return null;
    const r: RemittanceRun = {
      id: newId(),
      obligationId: o.id,
      jurisdictionKey: o.jurisdictionKey,
      status: "queued",
      amountCents: input.amountCents ?? o.amountDueCents,
      rail: input.rail || "manual",
      submissionRef: null,
      paymentEvidenceUri: null,
      outputUri: null,
      failureReason: null,
      createdAt: nowIso(),
      completedAt: null
    };
    runs.push(r);
    await publishOutbox({
      id: newId(),
      eventType: "tax.remittance.queued",
      aggregateId: r.id,
      aggregateType: "remittance_run",
      payload: { id: r.id, obligationId: o.id, amountCents: r.amountCents, rail: r.rail },
      occurredAt: nowIso()
    });
    return r;
  },

  /**
   * Submit a remittance run. Wave 10 simulates the submission; Wave 11 swaps
   * in a real rail connector via remittance-rail-connector-service.
   */
  async submitRemittance(id: string): Promise<RemittanceRun | null> {
    const r = runs.find((x) => x.id === id);
    if (!r) return null;
    r.status = "submitting";
    r.submissionRef = `sub_${r.id.slice(0, 12)}`;
    r.paymentEvidenceUri = `s3://crownx-remittance/${r.id}/evidence.pdf`;
    r.outputUri = `s3://crownx-remittance/${r.id}/manifest.json`;
    r.status = "submitted";
    return r;
  },

  /** Acknowledge a submitted remittance — terminal happy-path state. */
  async acknowledgeRemittance(id: string): Promise<RemittanceRun | null> {
    const r = runs.find((x) => x.id === id);
    if (!r) return null;
    if (r.status !== "submitted") return r;
    r.status = "acknowledged";
    r.completedAt = nowIso();
    const o = obligations.find((x) => x.id === r.obligationId);
    if (o) {
      o.status = "remitted";
      o.updatedAt = nowIso();
      await publishOutbox({
        id: newId(),
        eventType: "tax.obligation.remitted",
        aggregateId: o.id,
        aggregateType: "tax_obligation",
        payload: { id: o.id, jurisdictionKey: o.jurisdictionKey, obligationType: o.obligationType, periodKey: o.periodKey, amountCents: r.amountCents },
        occurredAt: nowIso()
      });
    }
    return r;
  },

  /** Mark a remittance failed and capture an exception record for routing. */
  async failRemittance(input: {
    id: string;
    reason: string;
    nextAction: RemittanceException["nextAction"];
  }): Promise<RemittanceRun | null> {
    const r = runs.find((x) => x.id === input.id);
    if (!r) return null;
    r.status = "failed";
    r.failureReason = input.reason;
    r.completedAt = nowIso();
    const o = obligations.find((x) => x.id === r.obligationId);
    if (o) {
      o.status = "exception";
      o.updatedAt = nowIso();
    }
    const exc: RemittanceException = {
      id: newId(),
      remittanceRunId: r.id,
      reason: input.reason,
      nextAction: input.nextAction,
      resolvedAt: null,
      createdAt: nowIso()
    };
    exceptions.push(exc);
    await publishOutbox({
      id: newId(),
      eventType: "tax.remittance.failed",
      aggregateId: r.id,
      aggregateType: "remittance_run",
      payload: { id: r.id, reason: input.reason, nextAction: input.nextAction },
      occurredAt: nowIso()
    });
    return r;
  },

  resolveException(excId: string) {
    const e = exceptions.find((x) => x.id === excId);
    if (!e) return null;
    e.resolvedAt = nowIso();
    return e;
  },

  /** Roll obligations forward to overdue if past due-date and not remitted. */
  rollOverdue() {
    const now = Date.now();
    let n = 0;
    for (const o of obligations) {
      if ((o.status === "open" || o.status === "filing_in_progress" || o.status === "ready_to_remit")
          && new Date(o.dueDate).getTime() < now) {
        o.status = "overdue";
        o.updatedAt = nowIso();
        n++;
      }
    }
    return { rolled: n };
  },

  // Read APIs
  listObligations: (status?: TaxObligationStatus) =>
    obligations.filter((o) => !status || o.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  obligationsByJurisdiction: (jur: string) => obligations.filter((o) => o.jurisdictionKey === jur),
  findObligation: (id: string) => obligations.find((o) => o.id === id) || null,
  upcomingDueObligations(windowDays = 14) {
    const now = Date.now();
    const window = windowDays * 24 * 60 * 60 * 1000;
    return obligations
      .filter((o) => o.status === "open" || o.status === "filing_in_progress" || o.status === "ready_to_remit")
      .filter((o) => {
        const d = new Date(o.dueDate).getTime();
        return d > now && d - now <= window;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },
  listRuns: (status?: RemittanceRunStatus) =>
    runs.filter((r) => !status || r.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findRun: (id: string) => runs.find((r) => r.id === id) || null,
  runsForObligation: (obligationId: string) => runs.filter((r) => r.obligationId === obligationId),
  listExceptions: (resolvedOnly?: boolean) =>
    exceptions.filter((e) => resolvedOnly === undefined || (resolvedOnly ? e.resolvedAt !== null : e.resolvedAt === null)),

  /** Aggregate dashboard view for the tax-governance-portal. */
  pipelineSummary() {
    const totalObligations = obligations.length;
    const byStatus: Record<TaxObligationStatus, number> = {
      open: 0, filing_in_progress: 0, ready_to_remit: 0, remitted: 0, overdue: 0, exception: 0, closed: 0
    };
    let totalDueCents = 0;
    let totalRemittedCents = 0;
    for (const o of obligations) {
      byStatus[o.status]++;
      if (o.status !== "remitted" && o.status !== "closed") totalDueCents += o.amountDueCents;
      if (o.status === "remitted") totalRemittedCents += o.amountDueCents;
    }
    return {
      totalObligations,
      byStatus,
      totalDueCents,
      totalRemittedCents,
      openExceptions: exceptions.filter((e) => !e.resolvedAt).length,
      runsTotal: runs.length
    };
  }
};
