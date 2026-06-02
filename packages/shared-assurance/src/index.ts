/**
 * Wave 9 revenue assurance primitives. Variance detection between
 * settlements, ledger entries, revenue-share calculations, and exported
 * partner statements.
 */
export type AssuranceAuditType =
  | "settlement_to_ledger"
  | "ledger_to_payout"
  | "revshare_to_statement"
  | "settlement_to_revshare"
  | "tax_to_remittance";

export type AssuranceAuditStatus = "queued" | "running" | "completed" | "failed";

export type VarianceType =
  | "amount_mismatch"
  | "missing_record"
  | "extra_record"
  | "date_drift"
  | "fee_leakage"
  | "duplicate_settlement";

export type VarianceSeverity = "low" | "medium" | "high" | "critical";

export type VarianceRecord = {
  varianceType: VarianceType;
  severity: VarianceSeverity;
  referenceType: string;
  referenceId: string;
  expectedCents?: number;
  actualCents?: number;
  driftCents?: number;
  detail: string;
};

export type AuditPair = {
  /** Reference key linking the two records (e.g. settlementId). */
  referenceId: string;
  referenceType: string;
  expectedCents: number;
  actualCents: number;
  /** Optional dates for date-drift detection. */
  expectedDate?: string;
  actualDate?: string;
};

/** Compute the absolute drift threshold needed to flag low/medium/high/critical. */
const SEVERITY_BANDS_CENTS: Array<{ minCents: number; severity: VarianceSeverity }> = [
  { minCents: 100000, severity: "critical" }, // $1,000+
  { minCents: 10000, severity: "high" },      // $100-$999
  { minCents: 1000, severity: "medium" },     // $10-$99
  { minCents: 1, severity: "low" }            // any drift
];

function classifyDrift(driftCents: number): VarianceSeverity {
  const abs = Math.abs(driftCents);
  for (const band of SEVERITY_BANDS_CENTS) {
    if (abs >= band.minCents) return band.severity;
  }
  return "low";
}

/**
 * Compare two parallel record sets and return variance records for any
 * mismatched amounts, missing entries, or extra entries.
 */
export function compareAuditPairs(
  expected: AuditPair[],
  actual: AuditPair[]
): VarianceRecord[] {
  const variances: VarianceRecord[] = [];
  const expectedByKey = new Map(expected.map((p) => [`${p.referenceType}:${p.referenceId}`, p]));
  const actualByKey = new Map(actual.map((p) => [`${p.referenceType}:${p.referenceId}`, p]));

  for (const [key, exp] of expectedByKey) {
    const act = actualByKey.get(key);
    if (!act) {
      variances.push({
        varianceType: "missing_record",
        severity: "high",
        referenceType: exp.referenceType,
        referenceId: exp.referenceId,
        expectedCents: exp.expectedCents,
        detail: `expected record ${key} missing in actual set`
      });
      continue;
    }
    const drift = act.actualCents - exp.expectedCents;
    if (drift !== 0) {
      variances.push({
        varianceType: "amount_mismatch",
        severity: classifyDrift(drift),
        referenceType: exp.referenceType,
        referenceId: exp.referenceId,
        expectedCents: exp.expectedCents,
        actualCents: act.actualCents,
        driftCents: drift,
        detail: `drift ${drift}c on ${key}`
      });
    }
    if (exp.expectedDate && act.actualDate && exp.expectedDate !== act.actualDate) {
      variances.push({
        varianceType: "date_drift",
        severity: "low",
        referenceType: exp.referenceType,
        referenceId: exp.referenceId,
        detail: `date drift expected=${exp.expectedDate} actual=${act.actualDate}`
      });
    }
  }
  for (const [key, act] of actualByKey) {
    if (!expectedByKey.has(key)) {
      variances.push({
        varianceType: "extra_record",
        severity: "medium",
        referenceType: act.referenceType,
        referenceId: act.referenceId,
        actualCents: act.actualCents,
        detail: `unexpected record ${key} in actual set`
      });
    }
  }
  return variances;
}

/** Roll up a variance list into severity counts and total leakage. */
export function summarizeVariances(variances: VarianceRecord[]): {
  totalVariances: number;
  bySeverity: Record<VarianceSeverity, number>;
  totalLeakageCents: number;
} {
  const bySeverity: Record<VarianceSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let leakage = 0;
  for (const v of variances) {
    bySeverity[v.severity] += 1;
    if (v.driftCents) leakage += Math.abs(v.driftCents);
    else if (v.varianceType === "missing_record" && v.expectedCents) leakage += v.expectedCents;
  }
  return { totalVariances: variances.length, bySeverity, totalLeakageCents: leakage };
}
