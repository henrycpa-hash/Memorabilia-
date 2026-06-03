/**
 * @crownx-jewel/shared-authcore — the AI authentication + pricing core.
 *
 * Implements the deterministic decision logic from the SOP (AI-Enhanced
 * Provenance, Decentralized Authenticity & Royalties): a multi-sensor fusion
 * that combines AI photo-matching, NFC/RF wave detection, Wi-Fi reflection,
 * thermal/heat material signature, material composition, and fractional
 * hairline micro-detail matching (plus tri-code, liveness, biometric, and
 * event correlation) into a single canonical authenticity confidence and a
 * Genesis/Verified/Counterfeit COA decision.
 *
 * It also computes a weighted, dynamic memorabilia value from the platform's
 * reference data sources (PSA AutographFacts, Beckett, JSA, WorthPoint, eBay
 * sold comps). The model is deterministic — same readings → same verdict —
 * which is what makes it defensible and auditable.
 */

/* ------------------------------------------------ multi-sensor fusion */

export interface SensorReadings {
  /** AI photo-matching vs PSA / event-archive exemplars (0–100) */
  photoMatch: number;
  /** NFC / RF tag wave detection (0–100) */
  nfcWave: number;
  /** Wi-Fi reflection signature match (0–100) */
  wifiReflection: number;
  /** thermal / heat material signature (0–100) */
  thermalHeat: number;
  /** material composition spectroscopy match (0–100) */
  materialComposition: number;
  /** fractional hairline micro-detail match — down to the hairline (0–100) */
  hairlineDetail: number;
  /** tri-code pre-check {QR, UV/hologram, NFC} passed */
  triCode: boolean;
  /** Step-1 liveness score (0–100) */
  liveness: number;
  /** signer biometric identity match (0–100) */
  biometric: number;
  /** Step-4 historical event correlation (0–100) */
  eventCorrelation: number;
}

export interface ModalityContribution {
  modality: string;
  label: string;
  weight: number;
  score: number;
  contribution: number;
}

export interface FusionResult {
  /** canonical authenticity confidence 0–100 */
  confidence: number;
  /** anomaly score 0–1 (high = likely tamper/spoof) */
  anomalyScore: number;
  triCode: boolean;
  contributions: ModalityContribution[];
}

const FUSION_WEIGHTS: { key: keyof SensorReadings; label: string; weight: number }[] = [
  { key: "hairlineDetail", label: "Fractional hairline detail", weight: 0.2 },
  { key: "photoMatch", label: "AI photo-matching", weight: 0.18 },
  { key: "materialComposition", label: "Material composition", weight: 0.16 },
  { key: "nfcWave", label: "NFC / RF wave", weight: 0.12 },
  { key: "eventCorrelation", label: "Event correlation", weight: 0.12 },
  { key: "biometric", label: "Signer biometric", weight: 0.1 },
  { key: "liveness", label: "Liveness", weight: 0.06 },
  { key: "wifiReflection", label: "Wi-Fi reflection", weight: 0.03 },
  { key: "thermalHeat", label: "Thermal / heat", weight: 0.03 }
];

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Fuse the multi-sensor readings into a canonical confidence + anomaly score. */
export function fuseSensors(r: SensorReadings): FusionResult {
  const contributions: ModalityContribution[] = FUSION_WEIGHTS.map((w) => {
    const score = clamp(Number(r[w.key]) || 0);
    return { modality: String(w.key), label: w.label, weight: w.weight, score, contribution: Math.round(w.weight * score * 10) / 10 };
  });
  const confidence = Math.round(contributions.reduce((a, c) => a + c.contribution, 0) * 10) / 10;

  // anomaly: high variance across modalities (some high, some low) signals a spoof
  const scores = contributions.map((c) => c.score);
  const mean = scores.reduce((a, s) => a + s, 0) / scores.length;
  const variance = scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  let anomalyScore = Math.min(1, std / 45);
  if (!r.triCode) anomalyScore = Math.min(1, anomalyScore + 0.35);
  // any single forensic modality very low while overall high → suspicious
  if (confidence > 70 && Math.min(r.hairlineDetail, r.materialComposition) < 40) anomalyScore = Math.min(1, anomalyScore + 0.25);

  return { confidence, anomalyScore: Math.round(anomalyScore * 100) / 100, triCode: r.triCode, contributions };
}

/* ------------------------------------------------ COA decision tree */

export type CoaDecision = "genesis" | "verified" | "counterfeit";

export interface CoaVerdict {
  decision: CoaDecision;
  confidence: number;
  anomalyScore: number;
  reason: string;
}

export const COA_CONFIDENCE_GATE = 62; // below this → counterfeit
export const COA_ANOMALY_GATE = 0.6; // above this → counterfeit

/** SOP Step 5 decision tree: genesis / verified / counterfeit. */
export function coaDecision(input: { confidence: number; anomalyScore: number; triCode: boolean; hasPriorCoa: boolean }): CoaVerdict {
  const { confidence, anomalyScore, triCode, hasPriorCoa } = input;
  if (!triCode) return { decision: "counterfeit", confidence, anomalyScore, reason: "tri-code pre-check failed" };
  if (anomalyScore > COA_ANOMALY_GATE) return { decision: "counterfeit", confidence, anomalyScore, reason: `anomaly ${anomalyScore} above gate` };
  if (confidence < COA_CONFIDENCE_GATE) return { decision: "counterfeit", confidence, anomalyScore, reason: `confidence ${confidence} below gate` };
  if (hasPriorCoa) return { decision: "verified", confidence, anomalyScore, reason: "matches prior COA lineage" };
  return { decision: "genesis", confidence, anomalyScore, reason: "first authenticated appearance" };
}

/* --------------------------------- weighted dynamic memorabilia value */

export interface PriceSources {
  /** PSA AutographFacts signature grade 1–10 */
  psaSignatureGrade?: number;
  /** Beckett price-guide value (cents) */
  beckettGuideCents?: number;
  /** JSA verified-letter on file */
  jsaVerified?: boolean;
  /** WorthPoint median realized value (cents) */
  worthpointMedianCents?: number;
  /** eBay recent sold comps (cents) */
  ebaySoldCompsCents?: number[];
  /** rarity / scarcity 0–100 */
  rarity?: number;
}

export interface PriceResult {
  valueCents: number;
  /** valuation confidence 0–100 (how much corroborating data backed it) */
  confidence: number;
  breakdown: { source: string; weight: number; valueCents: number }[];
  multiplier: number;
}

/** The reference data sources the AI pulls from to authenticate + price. */
export const TRAINING_SOURCES = [
  { id: "psa", name: "PSA AutographFacts", url: "https://www.psacard.com/autographfacts", role: "Verified signature exemplars (photo-match training)" },
  { id: "beckett", name: "Beckett Authentication (BAS)", url: "https://www.beckett-authentication.com", role: "Autograph price guide + exemplars" },
  { id: "jsa", name: "James Spence Authentication (JSA)", url: "https://www.spenceloa.com", role: "Verification database + sample signatures" },
  { id: "worthpoint", name: "WorthPoint", url: "https://www.worthpoint.com", role: "Realized-value comps + signature comparisons" },
  { id: "ebay", name: "eBay (sold listings)", url: "https://www.ebay.com", role: "Crowdsourced sold comps + valuation" }
] as const;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/**
 * Weighted, dynamic value pulled from the reference sources, scaled by the
 * live authentication confidence (an unauthenticated item is worth less).
 */
export function priceMemorabilia(sources: PriceSources, authConfidence = 100): PriceResult {
  const ebayMed = median(sources.ebaySoldCompsCents || []);
  // blend the realized-value signals (weights normalize over what's present)
  const parts: { source: string; weight: number; valueCents: number }[] = [];
  if (ebayMed) parts.push({ source: "eBay sold comps (median)", weight: 0.45, valueCents: ebayMed });
  if (sources.worthpointMedianCents) parts.push({ source: "WorthPoint median", weight: 0.3, valueCents: sources.worthpointMedianCents });
  if (sources.beckettGuideCents) parts.push({ source: "Beckett price guide", weight: 0.25, valueCents: sources.beckettGuideCents });
  const wsum = parts.reduce((a, p) => a + p.weight, 0) || 1;
  const base = parts.reduce((a, p) => a + (p.weight / wsum) * p.valueCents, 0);

  // multipliers: PSA grade, JSA verified, rarity, and live auth confidence
  const grade = sources.psaSignatureGrade ?? 0;
  const gradeMult = grade ? 0.7 + (grade / 10) * 0.6 : 1; // grade 10 → 1.3×, grade 5 → 1.0×
  const jsaMult = sources.jsaVerified ? 1.1 : 1;
  const rarityMult = 1 + ((sources.rarity ?? 0) / 100) * 0.5; // up to +50%
  const authMult = 0.5 + (clamp(authConfidence) / 100) * 0.5; // unauthenticated halves value
  const multiplier = Math.round(gradeMult * jsaMult * rarityMult * authMult * 1000) / 1000;

  const valueCents = Math.round(base * multiplier);
  const confidence = Math.min(100, parts.length * 22 + (grade ? 12 : 0) + (sources.jsaVerified ? 12 : 0));
  return {
    valueCents,
    confidence,
    multiplier,
    breakdown: parts.map((p) => ({ source: p.source, weight: Math.round((p.weight / wsum) * 100) / 100, valueCents: p.valueCents }))
  };
}

export function formatUsdCents(cents: number): string {
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(2)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}
