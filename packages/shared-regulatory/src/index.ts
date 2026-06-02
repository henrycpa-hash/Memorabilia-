/**
 * Wave 9 regulatory filing primitives. Cross-border filing profile
 * registry, period normalization, filing artifact bundle assembly.
 */
export type RegulatoryFilingType =
  | "vat_return"
  | "withholding_summary"
  | "1099_misc"
  | "1042_s"
  | "annual_revenue_summary"
  | "kyc_summary"
  | "data_protection_register"
  | "cross_border_data_export";

export type RegulatoryFilingStatus = "draft" | "ready_to_file" | "filed" | "rejected" | "amended";

export type FilingPeriodKey = string; // e.g. "2026-Q1", "2026-03", "2026"

export type FilingProfileRules = {
  /** Required line items for a complete filing. */
  requiredLineItems: string[];
  /** Period type — quarterly, monthly, annual. */
  periodType: "monthly" | "quarterly" | "annual";
  /** Standard deadline offset in days from period end. */
  deadlineDaysAfterPeriodEnd: number;
  /** Output format expected by regulator. */
  outputFormat: "csv" | "xml" | "json" | "pdf";
};

export type FilingArtifactBundle = {
  filingId: string;
  jurisdictionKey: string;
  filingType: RegulatoryFilingType;
  periodKey: FilingPeriodKey;
  artifacts: Array<{
    artifactType: string;
    uri: string;
    sizeBytes?: number;
  }>;
  generatedAt: string;
};

/**
 * Compute the filing deadline for a period given profile rules.
 */
export function computeFilingDeadline(
  periodEnd: string,
  rules: FilingProfileRules
): string {
  const t = new Date(periodEnd).getTime() + rules.deadlineDaysAfterPeriodEnd * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

/**
 * Validate that all required line items are present in a filing's data.
 */
export function validateFilingCompleteness(
  data: Record<string, unknown>,
  rules: FilingProfileRules
): { complete: boolean; missing: string[] } {
  const missing = rules.requiredLineItems.filter((k) => !(k in data));
  return { complete: missing.length === 0, missing };
}

/**
 * Compute a normalized period key from a date and period type.
 */
export function periodKeyForDate(d: Date, periodType: FilingProfileRules["periodType"]): FilingPeriodKey {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (periodType === "annual") return String(y);
  if (periodType === "monthly") return `${y}-${String(m).padStart(2, "0")}`;
  // quarterly
  const q = Math.ceil(m / 3);
  return `${y}-Q${q}`;
}
