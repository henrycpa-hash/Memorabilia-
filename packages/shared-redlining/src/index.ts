/**
 * Wave 9 redlining + negotiation primitives. Contract versions, redline
 * diffs, clause libraries, negotiation issue tracking.
 */
export type ContractVersionStatus = "draft" | "in_review" | "approved" | "superseded" | "executed";

export type RedlineDiffStatus = "computed" | "reviewed" | "accepted" | "rejected";

export type NegotiationIssueType =
  | "clause_change_requested"
  | "fallback_invoked"
  | "term_dispute"
  | "missing_term"
  | "policy_violation";

export type NegotiationIssueStatus = "open" | "in_review" | "resolved" | "deferred" | "rejected";

export type ClauseCategory =
  | "indemnification"
  | "liability_limit"
  | "termination"
  | "ip_ownership"
  | "data_processing"
  | "payment_terms"
  | "warranty"
  | "confidentiality"
  | "governing_law"
  | "audit_rights";

export type ClauseLibraryEntry = {
  clauseKey: string;
  category: ClauseCategory;
  /** Free-text body; production would store structured DOCX/HTML. */
  languageBody: string;
  /** 0 = preferred standard, 1 = first fallback, 2 = second fallback, etc. */
  fallbackRank: number;
  /** Whether this language requires legal review before acceptance. */
  requiresLegalReview: boolean;
};

export type RedlineDiffSummary = {
  baseVersionId: string;
  compareVersionId: string;
  /** Number of clauses added between base and compare. */
  clausesAdded: number;
  /** Number of clauses removed. */
  clausesRemoved: number;
  /** Number of clauses modified. */
  clausesModified: number;
  /** Per-clause change details. */
  changes: Array<{
    clauseKey: string;
    changeType: "added" | "removed" | "modified";
    severity: "low" | "medium" | "high";
  }>;
};

/**
 * Compute a deterministic diff summary between two clause maps.
 * Production would compute on structured DOCX. Wave 9 simulates with
 * keyed clause body strings.
 */
export function computeRedlineSummary(
  base: Record<string, string>,
  compare: Record<string, string>
): RedlineDiffSummary {
  const baseKeys = new Set(Object.keys(base));
  const compareKeys = new Set(Object.keys(compare));
  const changes: RedlineDiffSummary["changes"] = [];
  let added = 0, removed = 0, modified = 0;
  for (const k of compareKeys) {
    if (!baseKeys.has(k)) {
      changes.push({ clauseKey: k, changeType: "added", severity: classifySeverity(k) });
      added++;
    } else if (base[k] !== compare[k]) {
      changes.push({ clauseKey: k, changeType: "modified", severity: classifySeverity(k) });
      modified++;
    }
  }
  for (const k of baseKeys) {
    if (!compareKeys.has(k)) {
      changes.push({ clauseKey: k, changeType: "removed", severity: classifySeverity(k) });
      removed++;
    }
  }
  return {
    baseVersionId: "",
    compareVersionId: "",
    clausesAdded: added,
    clausesRemoved: removed,
    clausesModified: modified,
    changes
  };
}

function classifySeverity(clauseKey: string): "low" | "medium" | "high" {
  const high = ["indemnification", "liability_limit", "ip_ownership", "termination"];
  const medium = ["data_processing", "payment_terms", "warranty", "audit_rights"];
  for (const h of high) if (clauseKey.includes(h)) return "high";
  for (const m of medium) if (clauseKey.includes(m)) return "medium";
  return "low";
}

/** Pick the next fallback clause if the preferred one is rejected. */
export function nextFallback(
  clauseKey: string,
  rejectedRank: number,
  library: ClauseLibraryEntry[]
): ClauseLibraryEntry | null {
  return library.find((c) => c.clauseKey === clauseKey && c.fallbackRank > rejectedRank) || null;
}
