/**
 * Wave 9 sovereign deployment primitives. Sovereign tier classes,
 * tenant assignment policies, and export control evaluation.
 */
export type SovereignTier =
  | "commercial"          // standard multi-tenant SaaS
  | "regulated_enterprise" // enterprise with elevated compliance
  | "sovereign_dedicated"  // dedicated tenancy in a national region
  | "air_gapped";          // fully isolated, no cross-region traffic

export type SovereignAssignmentStatus = "active" | "transitioning" | "suspended" | "decommissioned";

export type ExportControlType =
  | "data_export"
  | "code_export"
  | "key_material_export"
  | "personnel_access"
  | "subprocessor_routing";

export type ExportControlDecision = "allow" | "deny" | "review_required";

export type SovereignClassPolicy = {
  /** Allowed regions where workloads in this class may operate. */
  allowedRegions: string[];
  /** Blocked regions — workloads explicitly may not run here. */
  blockedRegions: string[];
  /** Whether cross-region routing is permitted at all. */
  crossRegionRoutingAllowed: boolean;
  /** Whether sovereign approval is required to promote to production. */
  promotionRequiresApproval: boolean;
  /** Cryptographic posture: hsm | local_kms | bring_your_own_key. */
  keyMaterialPosture: "hsm" | "local_kms" | "byok";
  /** Free-form notes for operators. */
  notes?: string;
};

export type ExportControlRules = {
  /** If true, all exports of this control type are denied. */
  blockAll: boolean;
  /** Region keys allowed as export destinations. */
  allowedDestinations: string[];
  /** Region keys explicitly forbidden as export destinations. */
  blockedDestinations: string[];
  /** Whether the export requires manual sovereign-approval review. */
  reviewRequired: boolean;
};

export type ExportEvaluation = {
  decision: ExportControlDecision;
  reasons: string[];
  evaluatedAt: string;
};

/**
 * Evaluate a proposed export action against export-control rules.
 * deny > review_required > allow.
 */
export function evaluateExportControl(input: {
  controlType: ExportControlType;
  destinationRegion: string;
  rules: ExportControlRules;
}): ExportEvaluation {
  const ts = new Date().toISOString();
  if (input.rules.blockAll) {
    return { decision: "deny", reasons: [`${input.controlType} blocked by sovereign export control`], evaluatedAt: ts };
  }
  if (input.rules.blockedDestinations.includes(input.destinationRegion)) {
    return { decision: "deny", reasons: [`destination ${input.destinationRegion} explicitly blocked`], evaluatedAt: ts };
  }
  if (input.rules.allowedDestinations.length > 0
      && !input.rules.allowedDestinations.includes(input.destinationRegion)) {
    return { decision: "deny", reasons: [`destination ${input.destinationRegion} not in allowlist`], evaluatedAt: ts };
  }
  if (input.rules.reviewRequired) {
    return { decision: "review_required", reasons: [`${input.controlType} requires sovereign-approval review`], evaluatedAt: ts };
  }
  return { decision: "allow", reasons: [`${input.controlType} permitted to ${input.destinationRegion}`], evaluatedAt: ts };
}

/** Whether a deployment promotion is permitted for this tier without approval. */
export function isPromotionAutoApproved(tier: SovereignTier, policy: SovereignClassPolicy): boolean {
  if (policy.promotionRequiresApproval) return false;
  return tier === "commercial";
}
