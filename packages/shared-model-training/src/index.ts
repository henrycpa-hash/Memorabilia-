/**
 * Wave 6 model-training primitives. The model-training-service owns labeled
 * data queues, training jobs, and validation metrics. Wave 6 emits candidate
 * model entries that can be promoted into the Wave 5 ml-risk model registry.
 */
export type LabelClass =
  | "fraud_confirmed"
  | "fraud_suspected"
  | "legitimate"
  | "ambiguous";

export type DatasetStatus = "draft" | "ready" | "training" | "validated" | "archived";

export type TrainingJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type ValidationMetrics = {
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  sampleSize: number;
};

/**
 * Wave 6 baseline metrics. Wave 7 swaps in a real evaluator on top of held-out
 * data; this exists so the dashboards have a non-empty payload to render.
 */
export const BASELINE_METRICS: ValidationMetrics = {
  precision: 0.82,
  recall: 0.75,
  f1: 0.78,
  rocAuc: 0.86,
  sampleSize: 0
};
