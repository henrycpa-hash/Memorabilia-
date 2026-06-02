/**
 * Wave 8 data residency primitives. Region keys, residency policies,
 * tenant-region binding, evaluation against subject jurisdiction.
 */
export type ResidencyRegionKey =
  | "us_east"
  | "us_west"
  | "eu_west"
  | "eu_central"
  | "uk"
  | "apac_singapore"
  | "apac_tokyo"
  | "canada"
  | "brazil";

export type ResidencyPolicyStatus = "active" | "archived";

export type ResidencyPolicyRules = {
  /** Storage must occur in one of these regions. */
  allowedStorageRegions: ResidencyRegionKey[];
  /** Processing (compute) must occur in one of these regions. */
  allowedProcessingRegions: ResidencyRegionKey[];
  /** If true, exports may not cross these region boundaries. */
  exportBoundaries: ResidencyRegionKey[];
  /** Whether cross-region replication is permitted at all. */
  crossRegionReplicationAllowed: boolean;
  notes?: string;
};

export type ResidencyAssignmentStatus = "active" | "transitioning" | "suspended";

export type ResidencyEvaluationResult =
  | "allow"
  | "deny_storage"
  | "deny_processing"
  | "deny_export"
  | "deny_replication";

export type ResidencyEvaluation = {
  result: ResidencyEvaluationResult;
  reasons: string[];
  evaluatedAt: string;
};

export type ResidencyEvaluationInput = {
  action: "store" | "process" | "export" | "replicate";
  /** Where the action would occur. */
  targetRegion: ResidencyRegionKey;
  /** Origin region (for export/replicate). */
  sourceRegion?: ResidencyRegionKey;
};

/**
 * Evaluate a proposed action against the tenant's residency policy.
 */
export function evaluateResidency(
  input: ResidencyEvaluationInput,
  rules: ResidencyPolicyRules
): ResidencyEvaluation {
  const reasons: string[] = [];
  const ts = new Date().toISOString();

  if (input.action === "store") {
    if (!rules.allowedStorageRegions.includes(input.targetRegion)) {
      return {
        result: "deny_storage",
        reasons: [`storage in ${input.targetRegion} not in allowed ${JSON.stringify(rules.allowedStorageRegions)}`],
        evaluatedAt: ts
      };
    }
  }

  if (input.action === "process") {
    if (!rules.allowedProcessingRegions.includes(input.targetRegion)) {
      return {
        result: "deny_processing",
        reasons: [`processing in ${input.targetRegion} not in allowed ${JSON.stringify(rules.allowedProcessingRegions)}`],
        evaluatedAt: ts
      };
    }
  }

  if (input.action === "export") {
    if (rules.exportBoundaries.length > 0
        && input.sourceRegion
        && rules.exportBoundaries.includes(input.sourceRegion)
        && !rules.exportBoundaries.includes(input.targetRegion)) {
      return {
        result: "deny_export",
        reasons: [`export from boundary region ${input.sourceRegion} to ${input.targetRegion} not permitted`],
        evaluatedAt: ts
      };
    }
  }

  if (input.action === "replicate" && !rules.crossRegionReplicationAllowed
      && input.sourceRegion && input.sourceRegion !== input.targetRegion) {
    return {
      result: "deny_replication",
      reasons: ["cross-region replication is not permitted under this policy"],
      evaluatedAt: ts
    };
  }

  reasons.push(`action ${input.action} permitted in target ${input.targetRegion}`);
  return { result: "allow", reasons, evaluatedAt: ts };
}
