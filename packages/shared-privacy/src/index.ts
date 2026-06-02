/**
 * Wave 8 privacy governance primitives — release controls for federated
 * benchmarks, cohort thresholds, suppression rules, k-anon class binding.
 *
 * Wave 8 supplements Wave 7's simple "minimum members" suppression in
 * federated-analytics-service with full policy-based release decisions.
 */
export type PrivacyClass = "public" | "internal" | "tenant_scoped" | "restricted" | "regulated";

export type PrivacyPolicyStatus = "draft" | "active" | "archived";

export type ReleaseDecision = "allow" | "suppress" | "review_required" | "deny";

export type SuppressionReason =
  | "below_min_cohort"
  | "below_k_anonymity"
  | "policy_class_too_high"
  | "release_window_closed"
  | "missing_consent"
  | "denied_by_residency";

export type PrivacyPolicyRule = {
  ruleKey: string;
  description: string;
  /** Cohort size minimum below which the metric is suppressed. */
  minCohortSize: number;
  /** k-anonymity threshold — minimum identical records per quasi-identifier. */
  kAnonymityThreshold?: number;
  /** Highest privacy class permitted to release under this rule. */
  maxPrivacyClass: PrivacyClass;
  /** Per-metric whitelist; if set, only listed keys may release. */
  metricWhitelist?: string[];
  /** Per-metric blacklist; listed keys are always suppressed. */
  metricBlacklist?: string[];
};

export type ReleaseRequestSubject = {
  metricKey: string;
  cohortSize: number;
  kAnonymity?: number;
  privacyClass: PrivacyClass;
  requestingTenantId?: string;
  residencyRegion?: string;
};

export type ReleaseEvaluation = {
  decision: ReleaseDecision;
  reasons: string[];
  suppressionReasons: SuppressionReason[];
  evaluatedAt: string;
};

const CLASS_ORDER: Record<PrivacyClass, number> = {
  public: 0,
  internal: 1,
  tenant_scoped: 2,
  restricted: 3,
  regulated: 4
};

/**
 * Evaluate a release request against a single rule. Always-deny
 * conditions short-circuit; otherwise returns suppress / allow / review.
 */
export function evaluateRelease(
  subject: ReleaseRequestSubject,
  rule: PrivacyPolicyRule
): ReleaseEvaluation {
  const reasons: string[] = [];
  const suppressionReasons: SuppressionReason[] = [];

  if (rule.metricBlacklist?.includes(subject.metricKey)) {
    return {
      decision: "deny",
      reasons: [`metric ${subject.metricKey} is blacklisted`],
      suppressionReasons: ["policy_class_too_high"],
      evaluatedAt: new Date().toISOString()
    };
  }

  if (rule.metricWhitelist && !rule.metricWhitelist.includes(subject.metricKey)) {
    return {
      decision: "deny",
      reasons: [`metric ${subject.metricKey} is not in whitelist`],
      suppressionReasons: ["policy_class_too_high"],
      evaluatedAt: new Date().toISOString()
    };
  }

  if (CLASS_ORDER[subject.privacyClass] > CLASS_ORDER[rule.maxPrivacyClass]) {
    reasons.push(`privacy class ${subject.privacyClass} exceeds rule max ${rule.maxPrivacyClass}`);
    suppressionReasons.push("policy_class_too_high");
  }

  if (subject.cohortSize < rule.minCohortSize) {
    reasons.push(`cohort ${subject.cohortSize} below min ${rule.minCohortSize}`);
    suppressionReasons.push("below_min_cohort");
  }

  if (rule.kAnonymityThreshold != null && subject.kAnonymity != null
      && subject.kAnonymity < rule.kAnonymityThreshold) {
    reasons.push(`k-anon ${subject.kAnonymity} below threshold ${rule.kAnonymityThreshold}`);
    suppressionReasons.push("below_k_anonymity");
  }

  if (suppressionReasons.length > 0) {
    return {
      decision: subject.privacyClass === "regulated" ? "deny" : "suppress",
      reasons,
      suppressionReasons,
      evaluatedAt: new Date().toISOString()
    };
  }

  if (subject.privacyClass === "restricted" || subject.privacyClass === "regulated") {
    return {
      decision: "review_required",
      reasons: [`privacy class ${subject.privacyClass} requires manual review`],
      suppressionReasons: [],
      evaluatedAt: new Date().toISOString()
    };
  }

  return { decision: "allow", reasons: ["passes all checks"], suppressionReasons: [], evaluatedAt: new Date().toISOString() };
}
