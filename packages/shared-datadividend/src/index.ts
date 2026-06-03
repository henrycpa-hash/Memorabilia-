/**
 * @crownx-jewel/shared-datadividend — the AI-modeling Data Dividend math.
 *
 * As CrownX's authentication AI improves, it learns from CONSENTED capture data.
 * Every consented contribution mints a Data Contribution Token whose value is a
 * DYNAMIC weighted rate computed from the data's complexity, rarity, sensor-
 * matrix richness, authentication confidence, and novelty. Each token is hashed
 * to the specific model-improvement update it fed. Tokens whose data is in
 * UTILIZATION in the live pro product earn a pro-rata share of an AI-modeling
 * compensation pool — allocated from company profits by the board, honored by a
 * smart contract, and paid BEFORE shareholder dividends. The pool is funded by
 * (tied to) the revenue-producing activity that the AI cash-flows.
 *
 * Pure + deterministic (no runtime deps). The owning service supplies anchors.
 */

// ───────────────────────────── constants ─────────────────────────────

/** The full sensor/identifier matrix the fusion engine can capture (SOP §multi-sensor). */
export const MODALITY_MATRIX = [
  "photoMatch", "nfcWave", "wifiReflection", "thermalHeat",
  "materialComposition", "hairlineDetail", "liveness", "biometric",
  "eventCorrelation", "uvIr", "dnaTaggant", "ultrasonic"
] as const;
export type Modality = (typeof MODALITY_MATRIX)[number];

/** Weight is reported in basis points of a "data value unit" (10000 = 1.0). */
export const WEIGHT_SCALE_BPS = 10000;
/** Board-set default share of AI-modeling profit pool (overridable per epoch). */
export const DEFAULT_BOARD_ALLOC_BPS = 1500; // 15% of attributable profit
/** Tokens must clear this confidence to be eligible (only authentic data trains). */
export const MIN_ELIGIBLE_CONFIDENCE = 70;

// ───────────────────────────── weighted rate ─────────────────────────────

export interface DataWeightInput {
  /** which modalities actually fired (the captured matrix) */
  modalities: Modality[] | string[];
  /** authentication confidence 0–100 (only high-confidence authentic data is valuable) */
  confidence: number;
  /** anomaly score 0–100 (higher = more distinctive/complex signature) */
  anomalyScore?: number;
  /** how COMMON this asset class / signature is across the corpus, 0–1 (1 = ubiquitous) */
  commonness?: number;
  /** is this a NEW signature the corpus has not seen (rewards frontier data) */
  novel?: boolean;
  /** optional asset-class label (memorabilia, art, luxury, …) for the record */
  assetClass?: string;
}

export interface WeightFactor { factor: string; label: string; raw: number; contributionBps: number }
export interface DataWeight {
  weightBps: number;            // the dynamic weighted rate (data value unit, bps)
  eligible: boolean;            // confidence ≥ MIN_ELIGIBLE_CONFIDENCE
  factors: WeightFactor[];
  matrixCoverage: number;       // 0–1 fraction of the matrix captured
  rarity: number;               // 0–1 (1 - commonness)
  display: string;              // e.g. "1.84×"
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/**
 * Dynamic weighted-rate calculation. Five weighted factors blend into a single
 * data-value multiplier (bps). "How common, all-matrix, etc." → rarer + richer-
 * matrix + higher-entropy + higher-confidence + novel data is worth more.
 */
export function computeDataWeight(input: DataWeightInput): DataWeight {
  const captured = new Set((input.modalities || []).filter(Boolean));
  const matrixCoverage = clamp01(captured.size / MODALITY_MATRIX.length);
  const confidence = clamp01((input.confidence ?? 0) / 100);
  const complexity = clamp01((input.anomalyScore ?? 0) / 100);
  const rarity = clamp01(1 - (input.commonness ?? 0.5));
  const novelty = input.novel ? 1 : 0;

  // factor weights (sum 1.0) — the board can retune; matrix + rarity dominate
  const W = { matrix: 0.30, rarity: 0.28, complexity: 0.17, confidence: 0.15, novelty: 0.10 };
  const base = WEIGHT_SCALE_BPS; // 1.0×
  const factors: WeightFactor[] = [
    { factor: "matrix", label: "Sensor-matrix coverage", raw: matrixCoverage, contributionBps: Math.round(matrixCoverage * W.matrix * base) },
    { factor: "rarity", label: "Rarity (inverse commonness)", raw: rarity, contributionBps: Math.round(rarity * W.rarity * base) },
    { factor: "complexity", label: "Signature complexity", raw: complexity, contributionBps: Math.round(complexity * W.complexity * base) },
    { factor: "confidence", label: "Authentication confidence", raw: confidence, contributionBps: Math.round(confidence * W.confidence * base) },
    { factor: "novelty", label: "Frontier novelty", raw: novelty, contributionBps: Math.round(novelty * W.novelty * base) }
  ];
  // value multiplier = 0.5× floor + the blended contribution (so a full, rare,
  // novel, high-confidence capture approaches ~1.5×; a sparse common one ~0.5×)
  const blended = factors.reduce((a, f) => a + f.contributionBps, 0);
  const weightBps = Math.round(base * 0.5 + blended);
  return {
    weightBps,
    eligible: (input.confidence ?? 0) >= MIN_ELIGIBLE_CONFIDENCE,
    factors,
    matrixCoverage,
    rarity,
    display: `${(weightBps / WEIGHT_SCALE_BPS).toFixed(2)}×`
  };
}

// ───────────────────────────── token + binding ─────────────────────────────

export interface DataContributionToken {
  id: string;
  holderId: string;             // the user compensated
  assetId: string;
  coaId?: string;
  weightBps: number;
  assetClass?: string;
  mintedAt: string;
  /** the model-improvement update this token's data fed (hash binding) */
  modelUpdateId?: string;
  hashedToUpdate?: string;
  /** true once the update is deployed to the live PRO product (earns dividends) */
  inUtilization: boolean;
  retired?: boolean;
}

/** Deterministic token→update binding hash (the service may re-anchor it). */
export function tokenBindingHash(tokenId: string, modelUpdateId: string, weightBps: number): string {
  let h = 2166136261 >>> 0;
  const s = `${tokenId}:${modelUpdateId}:${weightBps}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `0xdt_${h.toString(16).padStart(8, "0")}`;
}

// ───────────────────────────── pool + distribution ─────────────────────────────

/**
 * Allocate the AI-modeling compensation pool from attributable profit. The board
 * sets the share (bps). This is computed/honored BEFORE shareholder dividends —
 * the smart contract pays modeling contributors first.
 */
export function allocatePool(attributableProfitCents: number, boardAllocBps = DEFAULT_BOARD_ALLOC_BPS): { poolCents: number; boardAllocBps: number; residualForDividendsCents: number } {
  const profit = Math.max(0, Math.floor(attributableProfitCents || 0));
  const bps = Math.max(0, Math.min(WEIGHT_SCALE_BPS, Math.floor(boardAllocBps)));
  const poolCents = Math.floor((profit * bps) / WEIGHT_SCALE_BPS);
  return { poolCents, boardAllocBps: bps, residualForDividendsCents: profit - poolCents };
}

export interface Payout { tokenId: string; holderId: string; weightBps: number; shareBps: number; payoutCents: number }

/**
 * Pro-rata distribution among tokens IN UTILIZATION in the live product, weighted
 * by their data-value (weightBps). Tokens not yet deployed earn nothing this epoch.
 */
export function distributeCompensation(tokens: DataContributionToken[], poolCents: number): { payouts: Payout[]; distributedCents: number; totalWeightBps: number } {
  const active = tokens.filter((t) => t.inUtilization && !t.retired);
  const totalWeightBps = active.reduce((a, t) => a + t.weightBps, 0);
  if (totalWeightBps <= 0 || poolCents <= 0) return { payouts: [], distributedCents: 0, totalWeightBps };
  let distributed = 0;
  const payouts: Payout[] = active.map((t) => {
    const shareBps = Math.round((t.weightBps / totalWeightBps) * WEIGHT_SCALE_BPS);
    const payoutCents = Math.floor((poolCents * t.weightBps) / totalWeightBps);
    distributed += payoutCents;
    return { tokenId: t.id, holderId: t.holderId, weightBps: t.weightBps, shareBps, payoutCents };
  });
  return { payouts, distributedCents: distributed, totalWeightBps };
}

/** Aggregate payouts to per-holder totals (a holder may hold many tokens). */
export function rollupByHolder(payouts: Payout[]): { holderId: string; tokens: number; payoutCents: number }[] {
  const m = new Map<string, { holderId: string; tokens: number; payoutCents: number }>();
  for (const p of payouts) {
    const cur = m.get(p.holderId) || { holderId: p.holderId, tokens: 0, payoutCents: 0 };
    cur.tokens += 1; cur.payoutCents += p.payoutCents;
    m.set(p.holderId, cur);
  }
  return [...m.values()].sort((a, b) => b.payoutCents - a.payoutCents);
}

export function formatUsdCents(cents: number): string {
  const v = (cents || 0) / 100;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
