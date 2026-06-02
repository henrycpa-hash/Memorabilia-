/**
 * Wave 9 enterprise sales / diligence automation primitives. Opportunity
 * stage tracking, diligence checklist composition, response item ledger.
 */
export type SalesStage =
  | "discovery"
  | "qualification"
  | "evaluation"
  | "diligence"
  | "negotiation"
  | "executed"
  | "closed_lost";

export type DiligenceWorkspaceStatus =
  | "preparing"
  | "in_progress"
  | "buyer_review"
  | "completed"
  | "abandoned";

export type ResponseItemStatus = "pending" | "in_progress" | "ready" | "delivered" | "blocked";

export type DiligenceChecklistItem = {
  itemKey: string;
  title: string;
  category: "security" | "privacy" | "legal" | "financial" | "compliance" | "operations" | "commercial";
  /** Default reusable response set this item maps into. */
  defaultEvidenceRef?: string;
  /** True if buyer-specific drafting is required. */
  buyerSpecific: boolean;
  /** Effort estimate in hours. */
  estimatedEffortHours: number;
};

/**
 * Default checklist applied when a workspace is opened with no overrides.
 * Mirrors common SOC 2 / SIG / vendor-security combined diligence.
 */
export const DEFAULT_DILIGENCE_CHECKLIST: DiligenceChecklistItem[] = [
  { itemKey: "soc2_report", title: "SOC 2 Type II Report", category: "security", defaultEvidenceRef: "audit:soc2_latest", buyerSpecific: false, estimatedEffortHours: 0.5 },
  { itemKey: "iso_certs", title: "ISO 27001 / 27701 Certificates", category: "security", buyerSpecific: false, estimatedEffortHours: 0.25 },
  { itemKey: "sig_questionnaire", title: "SIG Questionnaire", category: "security", defaultEvidenceRef: "audit:sig_latest", buyerSpecific: true, estimatedEffortHours: 4 },
  { itemKey: "data_processing_addendum", title: "Data Processing Addendum (DPA)", category: "privacy", buyerSpecific: true, estimatedEffortHours: 2 },
  { itemKey: "subprocessor_list", title: "Subprocessor List", category: "privacy", defaultEvidenceRef: "doc:subprocessors", buyerSpecific: false, estimatedEffortHours: 0.25 },
  { itemKey: "msa_redline", title: "Master Services Agreement (with redlines)", category: "legal", buyerSpecific: true, estimatedEffortHours: 8 },
  { itemKey: "cyber_insurance", title: "Cyber Liability Insurance Certificate", category: "legal", buyerSpecific: false, estimatedEffortHours: 0.25 },
  { itemKey: "audited_financials", title: "Audited Financial Statements", category: "financial", buyerSpecific: false, estimatedEffortHours: 0.5 },
  { itemKey: "incident_response_plan", title: "Incident Response Plan summary", category: "operations", defaultEvidenceRef: "policy:irp", buyerSpecific: false, estimatedEffortHours: 0.5 },
  { itemKey: "bcdr_summary", title: "BC/DR Summary", category: "operations", defaultEvidenceRef: "policy:bcdr", buyerSpecific: false, estimatedEffortHours: 0.5 }
];

/** Score a workspace on completeness (delivered / total). */
export function workspaceCompleteness(items: Array<{ status: ResponseItemStatus }>): {
  total: number;
  delivered: number;
  blocked: number;
  pending: number;
  completenessPct: number;
} {
  const total = items.length;
  const delivered = items.filter((i) => i.status === "delivered").length;
  const blocked = items.filter((i) => i.status === "blocked").length;
  const pending = items.filter((i) => i.status === "pending" || i.status === "in_progress").length;
  return {
    total,
    delivered,
    blocked,
    pending,
    completenessPct: total === 0 ? 0 : Math.round((delivered / total) * 100)
  };
}

/** Estimate remaining effort hours for non-delivered items. */
export function estimateRemainingEffort(
  items: Array<{ itemKey: string; status: ResponseItemStatus }>,
  checklist: DiligenceChecklistItem[]
): number {
  const map = new Map(checklist.map((c) => [c.itemKey, c.estimatedEffortHours]));
  return items
    .filter((i) => i.status !== "delivered")
    .reduce((sum, i) => sum + (map.get(i.itemKey) || 0), 0);
}

/** Forward stage progression with guard rails. */
export function advanceStage(current: SalesStage): SalesStage | null {
  const order: SalesStage[] = ["discovery", "qualification", "evaluation", "diligence", "negotiation", "executed"];
  const idx = order.indexOf(current);
  if (idx < 0 || idx === order.length - 1) return null;
  return order[idx + 1];
}
