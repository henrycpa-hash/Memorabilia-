/**
 * Wave 6 policy compliance primitives.
 *
 * Policy packs encode school / league / NIL constraints that the
 * policy-compliance-service evaluates against subjects (campaigns,
 * collectibles, social posts, partner listings).
 */
export type PolicyType = "school" | "league" | "territory" | "nil_general" | "tenant";

export type PolicyResult = "approve" | "approve_with_conditions" | "reject" | "review";

export type PolicyRule = {
  ruleKey: string;
  description: string;

  // Optional structured constraints. Wave 6 supports a deterministic subset;
  // Wave 7 layers a real expression engine on top.
  prohibitedTerms?: string[];               // case-insensitive substrings
  allowedTerritories?: string[];            // ISO country / region codes
  prohibitedTerritories?: string[];
  minAgeYears?: number;
  maxRewardUsd?: number;                    // hard cap per evaluation
  prohibitedRewardTypes?: string[];
  prohibitedAudienceTypes?: string[];
  rightsWindowDays?: number;                // licensing window length
};

export type PolicyPack = {
  id: string;
  policyType: PolicyType;
  name: string;
  version: string;
  status: "draft" | "active" | "archived";
  rules: PolicyRule[];
  createdAt: string;
};

export type ComplianceSubject = {
  subjectType: "campaign" | "social_post" | "partner_listing" | "collectible";
  subjectId: string;

  // Generic fields the evaluator inspects.
  text?: string;
  audienceType?: string;
  rewardUsd?: number;
  rewardType?: string;
  territory?: string;
  participantAgeYears?: number;
  rightsWindowDays?: number;
};

export type ComplianceEvaluation = {
  result: PolicyResult;
  reasons: string[];
  matchedRules: string[];
  conditions: string[];
};

/**
 * Deterministic evaluator. Walks every rule in the pack and combines results.
 * - Hard violations (prohibited terms, prohibited territories, age below
 *   minimum, reward over cap, prohibited reward/audience) → reject.
 * - Soft conditions (rights window beyond pack length, missing territory)
 *   → approve_with_conditions.
 * - No matched rules + no violations → approve.
 */
export function evaluatePolicy(
  pack: PolicyPack,
  subject: ComplianceSubject
): ComplianceEvaluation {
  if (pack.status !== "active") {
    return { result: "review", reasons: ["policy_pack_inactive"], matchedRules: [], conditions: [] };
  }

  const reasons: string[] = [];
  const matched: string[] = [];
  const conditions: string[] = [];
  let hardReject = false;

  for (const rule of pack.rules) {
    let ruleHit = false;

    if (rule.prohibitedTerms && subject.text) {
      const text = subject.text.toLowerCase();
      const hit = rule.prohibitedTerms.find((term) => text.includes(term.toLowerCase()));
      if (hit) {
        reasons.push(`prohibited_term:${hit}`);
        hardReject = true;
        ruleHit = true;
      }
    }

    if (rule.prohibitedTerritories && subject.territory) {
      if (rule.prohibitedTerritories.includes(subject.territory)) {
        reasons.push(`prohibited_territory:${subject.territory}`);
        hardReject = true;
        ruleHit = true;
      }
    }
    if (rule.allowedTerritories && subject.territory) {
      if (!rule.allowedTerritories.includes(subject.territory)) {
        reasons.push(`territory_not_allowed:${subject.territory}`);
        hardReject = true;
        ruleHit = true;
      }
    }
    if (rule.allowedTerritories && !subject.territory) {
      conditions.push(`territory_required:${rule.allowedTerritories.join("|")}`);
      ruleHit = true;
    }

    if (rule.minAgeYears != null && subject.participantAgeYears != null) {
      if (subject.participantAgeYears < rule.minAgeYears) {
        reasons.push(`under_min_age:${rule.minAgeYears}`);
        hardReject = true;
        ruleHit = true;
      }
    }

    if (rule.maxRewardUsd != null && subject.rewardUsd != null) {
      if (subject.rewardUsd > rule.maxRewardUsd) {
        reasons.push(`reward_over_cap:${rule.maxRewardUsd}`);
        hardReject = true;
        ruleHit = true;
      }
    }

    if (rule.prohibitedRewardTypes && subject.rewardType) {
      if (rule.prohibitedRewardTypes.includes(subject.rewardType)) {
        reasons.push(`prohibited_reward_type:${subject.rewardType}`);
        hardReject = true;
        ruleHit = true;
      }
    }

    if (rule.prohibitedAudienceTypes && subject.audienceType) {
      if (rule.prohibitedAudienceTypes.includes(subject.audienceType)) {
        reasons.push(`prohibited_audience:${subject.audienceType}`);
        hardReject = true;
        ruleHit = true;
      }
    }

    if (rule.rightsWindowDays != null && subject.rightsWindowDays != null) {
      if (subject.rightsWindowDays > rule.rightsWindowDays) {
        conditions.push(`shorten_rights_window_to:${rule.rightsWindowDays}`);
        ruleHit = true;
      }
    }

    if (ruleHit) matched.push(rule.ruleKey);
  }

  let result: PolicyResult = "approve";
  if (hardReject) result = "reject";
  else if (conditions.length > 0) result = "approve_with_conditions";

  return { result, reasons, matchedRules: matched, conditions };
}
