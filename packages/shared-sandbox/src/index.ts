/**
 * Wave 7 policy sandbox primitives. Run a campaign / collectible / social-post
 * subject through one or many policy packs in a "what-if" mode without
 * persisting it as a binding evaluation. Used for pre-launch review.
 */
export type SimulationStatus = "queued" | "running" | "completed" | "failed";

export type SimulationVariant = {
  variantKey: string;
  description?: string;
  // Subject overrides relative to the base subject — allows comparing
  // alternate sponsor categories, geographies, audiences, etc.
  subjectOverrides?: Record<string, unknown>;
};

export type SimulationVariantResult = {
  variantKey: string;
  result: "approve" | "approve_with_conditions" | "review" | "reject";
  reasons: string[];
  conditions: string[];
  matchedRules: string[];
};

export type SimulationOutcome = {
  baseResult: SimulationVariantResult;
  variantResults: SimulationVariantResult[];
  varianceExplanation: string;
};

/**
 * Build a quick variance description: which variant flipped result vs base.
 */
export function explainVariance(base: SimulationVariantResult, variants: SimulationVariantResult[]): string {
  const flips = variants.filter((v) => v.result !== base.result);
  if (flips.length === 0) {
    return "All variants produced the same verdict as the base subject.";
  }
  const lines = flips.map((v) => `${v.variantKey}: ${base.result} → ${v.result}`);
  return `Variants that diverged from base "${base.result}": ${lines.join("; ")}`;
}
