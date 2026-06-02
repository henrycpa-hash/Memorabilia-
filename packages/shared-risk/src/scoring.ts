import { weightOf } from "./signals";

export type RiskBand = "low" | "moderate" | "high" | "critical";

export type RiskScore = {
  score: number;
  riskBand: RiskBand;
  reasons: string[];
};

/**
 * Wave 4 risk scoring: explicit summed weights with banded thresholds. Wave 5
 * swaps the implementation for ML inference but the public RiskScore shape
 * stays stable.
 */
export function scoreRisk(signals: string[]): RiskScore {
  let score = 0;
  const reasons: string[] = [];
  for (const key of signals) {
    const w = weightOf(key);
    if (w > 0) {
      score += w;
      reasons.push(key);
    }
  }
  const riskBand: RiskBand =
    score >= 60 ? "critical" : score >= 40 ? "high" : score >= 20 ? "moderate" : "low";
  return { score, riskBand, reasons };
}

/**
 * Returns true when a settlement matching the given band must be held for
 * manual review.
 */
export function shouldHoldForRisk(band: RiskBand): boolean {
  return band === "high" || band === "critical";
}
