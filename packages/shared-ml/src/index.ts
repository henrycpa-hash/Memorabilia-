/**
 * Wave 5 ML risk inference primitives.
 *
 * Wave 4 used hand-tuned rule weights. Wave 5 layers on top of that with a
 * proper feature vector + scored decision shape, champion/challenger logging,
 * and explanation payloads. Wave 5 ships a deterministic linear-combination
 * scorer; Wave 6 swaps in real model artifacts loaded from a registry.
 */
export type FeatureKey =
  | "account_age_days"
  | "device_overlap"
  | "dispute_rate"
  | "price_deviation"
  | "account_freshness"
  | "offer_velocity"
  | "bid_velocity"
  | "payout_destination_changes"
  | "watchlist_manipulation_score"
  | "campaign_abuse_score";

export type FeatureVector = Partial<Record<FeatureKey, number>>;

export type RiskDecision = "approve" | "review" | "hold";

export type InferenceResult = {
  score: number; // 0..1
  decision: RiskDecision;
  modelName: string;
  modelVersion: string;
  explanationJson: {
    topFactors: FeatureKey[];
    perFactor: Record<string, number>;
    threshold: { review: number; hold: number };
  };
};

const WEIGHTS: Record<string, number> = {
  device_overlap: 0.2,
  dispute_rate: 0.25,
  price_deviation: 0.15,
  account_freshness: 0.1,
  offer_velocity: 0.05,
  bid_velocity: 0.05,
  payout_destination_changes: 0.1,
  watchlist_manipulation_score: 0.05,
  campaign_abuse_score: 0.05
};

const REVIEW_THRESHOLD = 0.45;
const HOLD_THRESHOLD = 0.75;

/**
 * Wave 5 reference inference. Linear combination of weighted features with
 * a 0.10 base rate, capped at 0.99.
 */
export function inferRisk(input: {
  subjectType: string;
  subjectId: string;
  featureVector: FeatureVector;
  modelName?: string;
  modelVersion?: string;
}): InferenceResult {
  const v = input.featureVector;
  const perFactor: Record<string, number> = {};
  let raw = 0.1; // base
  for (const [key, w] of Object.entries(WEIGHTS)) {
    const x = v[key as FeatureKey] ?? 0;
    const contribution = x * w;
    perFactor[key] = contribution;
    raw += contribution;
  }
  const score = Math.max(0, Math.min(0.99, raw));
  const decision: RiskDecision =
    score >= HOLD_THRESHOLD ? "hold" : score >= REVIEW_THRESHOLD ? "review" : "approve";

  // Top factors = sorted descending contribution.
  const topFactors = Object.entries(perFactor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k as FeatureKey);

  return {
    score,
    decision,
    modelName: input.modelName || "fraud-risk-linear",
    modelVersion: input.modelVersion || "v1",
    explanationJson: {
      topFactors,
      perFactor,
      threshold: { review: REVIEW_THRESHOLD, hold: HOLD_THRESHOLD }
    }
  };
}
