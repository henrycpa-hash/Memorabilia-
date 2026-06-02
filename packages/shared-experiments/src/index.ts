/**
 * Wave 5 experimentation primitives.
 *
 * The experimentation-service stores experiments + per-subject exposures and
 * conversion events. Wave 5 supports deterministic hashed-bucket assignment so
 * the same subjectId always maps to the same variant for a given experiment.
 */
export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export type TargetSurface =
  | "story_page_layout"
  | "checkout_cta"
  | "watchlist_prompt"
  | "creator_campaign"
  | "email_subject"
  | "share_card_style"
  | "drop_countdown_urgency";

export type Variant = {
  key: string;
  weight: number; // 0..100 — sums across variants should be 100
};

export type ExposureAssignment = {
  experimentId: string;
  subjectId: string;
  variantKey: string;
};

/**
 * Deterministic-but-balanced bucket assignment. Hash the subjectId+experimentId
 * pair into a 0..99 bucket, then walk variants weight-by-weight.
 */
export function assignVariant(input: {
  experimentId: string;
  subjectId: string;
  variants: Variant[];
}): ExposureAssignment {
  if (!input.variants.length) {
    return {
      experimentId: input.experimentId,
      subjectId: input.subjectId,
      variantKey: "control"
    };
  }
  // Simple FNV-1a-ish hash so we don't need crypto.
  const key = `${input.experimentId}:${input.subjectId}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = Math.abs(hash) % 100;
  let cursor = 0;
  for (const v of input.variants) {
    cursor += v.weight;
    if (bucket < cursor) {
      return {
        experimentId: input.experimentId,
        subjectId: input.subjectId,
        variantKey: v.key
      };
    }
  }
  return {
    experimentId: input.experimentId,
    subjectId: input.subjectId,
    variantKey: input.variants[input.variants.length - 1].key
  };
}
