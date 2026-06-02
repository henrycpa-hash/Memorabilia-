/**
 * Wave 5 reporting primitives. The reporting-service generates packs by
 * pulling from the analytics-warehouse and shaping the response into one of
 * these report types. Wave 5 returns JSON; Wave 6 adds CSV/XLSX/PDF exports.
 */
export type ReportType =
  | "board_executive"
  | "creator_performance"
  | "risk_and_trust"
  | "settlement_and_payout"
  | "campaign_and_experiment"
  | "regulatory_export";

export type ReportFormat = "json" | "csv" | "xlsx" | "pdf";

export type ReportRequest = {
  reportType: ReportType;
  format: ReportFormat;
  scope?: { creatorId?: string; from?: string; to?: string };
};

export type ReportSection = {
  key: string;
  label: string;
  metrics: Record<string, string | number>;
};

export type Report = {
  id: string;
  reportType: ReportType;
  format: ReportFormat;
  generatedAt: string;
  sections: ReportSection[];
  scope?: { creatorId?: string; from?: string; to?: string };
};
