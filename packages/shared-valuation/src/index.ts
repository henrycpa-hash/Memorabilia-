/**
 * @crownx-jewel/shared-valuation — the dynamic Athlete Index model.
 *
 * Values a celebrity/athlete for their actions AND values, on and off the field
 * — so they're "not just floating on dreams." The index has a HARD intrinsic
 * floor (the discounted cash flow of royalty income from signed contracts +
 * sponsor smart contracts) plus a BRAND component driven by weighted, auditable
 * signals: on-field performance, off-field conduct, press sentiment (positive &
 * negative), memorabilia trade velocity, market supply (scarcity), social reach,
 * and any number of pluggable custom data points. Output is a stock-like
 * price-per-share so the athlete can be fractionalized — anyone can own a piece.
 *
 * Deterministic: same signals → same index. The breakdown is returned so the
 * ticker can show exactly what moved the price.
 */

export interface AthleteSignals {
  /** 0–100 — performance on the field/court (stats, wins, awards) */
  onFieldPerformance: number;
  /** 0–100 — conduct & values off the field (community, leadership, reputation) */
  offFieldConduct: number;
  /** -100..+100 — net press sentiment (negative press drags, positive lifts) */
  pressSentiment: number;
  /** discounted present value (cents) of royalty income from all signed
   *  contracts + sponsor smart contracts — the intrinsic floor */
  royaltyDcfCents: number;
  /** memorabilia/collectible resales per 30 days — liquidity / demand */
  tradeVelocity: number;
  /** how many of this athlete's collectibles exist in the market (supply) */
  marketSupply: number;
  /** social reach (followers) — log-scaled */
  socialReach: number;
  /** extensible: any other ingestible data point, normalized 0–100 with a weight */
  custom?: { key: string; label: string; score: number; weight: number }[];
}

export interface IndexOptions {
  sharesOutstanding: number;
  /** ceiling for the brand component, cents (calibration; default $50M) */
  brandCapCents?: number;
  /** supply level considered "neutral" for the scarcity factor (default 500) */
  neutralSupply?: number;
  /** net demand pressure −1..+1 (buys lift, sells dampen) — drives elasticity */
  demandPressure?: number;
  /** price elasticity of demand pressure (default 0.3 → up to ±15% swing) */
  elasticity?: number;
}

export type ContractKind = "endorsement" | "nil" | "salary" | "sponsor_smart_contract" | "licensing";

export interface AthleteContract {
  id: string;
  athleteId: string;
  counterparty: string;
  kind: ContractKind;
  /** annual value in cents */
  annualValueCents: number;
  /** length of the deal in years */
  termYears: number;
  /** annual discount rate for the DCF (default 0.12) */
  discountRate?: number;
  /** royalty/payout share that flows to the athlete index (default 1.0 of value) */
  royaltyShare?: number;
  /** ONLY verified contracts feed the valuation */
  verified: boolean;
}

export interface ContractDcf {
  dcfCents: number;
  totalNominalCents: number;
  perYearCents: number[];
}

/** DCF of a single contract over its full life: Σ annual·share / (1+r)^t. */
export function computeContractDcf(c: AthleteContract): ContractDcf {
  const r = c.discountRate ?? 0.12;
  const share = c.royaltyShare ?? 1;
  const years = Math.max(1, Math.min(40, Math.floor(c.termYears)));
  const perYearCents: number[] = [];
  let pv = 0;
  let nominal = 0;
  for (let t = 1; t <= years; t++) {
    const cash = c.annualValueCents * share;
    nominal += cash;
    const disc = Math.round(cash / Math.pow(1 + r, t));
    perYearCents.push(disc);
    pv += disc;
  }
  return { dcfCents: Math.round(pv), totalNominalCents: Math.round(nominal), perYearCents };
}

/** Sum the DCF of every VERIFIED contract — the athlete's intrinsic floor. */
export function sumVerifiedContractDcf(contracts: AthleteContract[]): number {
  return contracts.filter((c) => c.verified).reduce((a, c) => a + computeContractDcf(c).dcfCents, 0);
}

export interface FactorContribution {
  factor: string;
  label: string;
  weight: number;
  /** normalized 0–100 score for this factor */
  score: number;
  /** cents this factor contributed to market cap */
  contributionCents: number;
}

export interface AthleteIndex {
  marketCapCents: number;
  pricePerShareCents: number;
  sharesOutstanding: number;
  /** 0–100 composite brand score */
  brandScore: number;
  dcfComponentCents: number;
  brandComponentCents: number;
  scarcityFactor: number;
  elasticityFactor: number;
  breakdown: FactorContribution[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** map -100..100 → 0..100 */
export const normalizeSentiment = (s: number) => clamp((s + 100) / 2, 0, 100);
/** trades/30d → 0..100 (saturates around 50 trades) */
export const normalizeVelocity = (t: number) => clamp((t / 50) * 100, 0, 100);
/** followers → 0..100, log-scaled (1 → 0, 100M → 100) */
export const normalizeReach = (f: number) => clamp((Math.log10(Math.max(1, f)) / 8) * 100, 0, 100);

const BASE_WEIGHTS = {
  onFieldPerformance: 0.3,
  offFieldConduct: 0.15,
  pressSentiment: 0.2,
  tradeVelocity: 0.2,
  socialReach: 0.15
};

/**
 * Compute the athlete index. Brand score is a weighted blend of the normalized
 * signals (custom signals are folded in and the weights re-normalized), scaled
 * to a brand component, added to the royalty-DCF floor, then adjusted by a
 * supply-scarcity factor and divided across the outstanding shares.
 */
export function computeAthleteIndex(signals: AthleteSignals, opts: IndexOptions): AthleteIndex {
  const brandCap = opts.brandCapCents ?? 50_000_000_00; // $50,000,000.00
  const neutralSupply = opts.neutralSupply ?? 500;

  const normalized: { factor: string; label: string; weight: number; score: number }[] = [
    { factor: "onFieldPerformance", label: "On-field performance", weight: BASE_WEIGHTS.onFieldPerformance, score: clamp(signals.onFieldPerformance, 0, 100) },
    { factor: "offFieldConduct", label: "Off-field conduct & values", weight: BASE_WEIGHTS.offFieldConduct, score: clamp(signals.offFieldConduct, 0, 100) },
    { factor: "pressSentiment", label: "Press sentiment", weight: BASE_WEIGHTS.pressSentiment, score: normalizeSentiment(signals.pressSentiment) },
    { factor: "tradeVelocity", label: "Memorabilia trade velocity", weight: BASE_WEIGHTS.tradeVelocity, score: normalizeVelocity(signals.tradeVelocity) },
    { factor: "socialReach", label: "Social reach", weight: BASE_WEIGHTS.socialReach, score: normalizeReach(signals.socialReach) }
  ];
  for (const c of signals.custom ?? []) {
    normalized.push({ factor: `custom:${c.key}`, label: c.label, weight: c.weight, score: clamp(c.score, 0, 100) });
  }

  // re-normalize weights so they sum to 1 (keeps custom signals additive & honest)
  const totalWeight = normalized.reduce((a, n) => a + n.weight, 0) || 1;
  const brandScore = normalized.reduce((a, n) => a + (n.weight / totalWeight) * n.score, 0);
  const brandComponentCents = Math.round((brandScore / 100) * brandCap);

  // scarcity: fewer collectibles in market → richer per-unit; more → diluted
  const scarcityFactor = clamp(1 + (neutralSupply - signals.marketSupply) / neutralSupply * 0.2, 0.8, 1.25);

  // price elasticity: net buy/sell demand pressure swings the price within a band
  const elasticityFactor = clamp(1 + clamp(opts.demandPressure ?? 0, -1, 1) * (opts.elasticity ?? 0.3) * 0.5, 0.75, 1.3);

  const dcfComponentCents = Math.max(0, Math.round(signals.royaltyDcfCents));
  const marketCapCents = Math.round((dcfComponentCents + brandComponentCents) * scarcityFactor * elasticityFactor);
  const pricePerShareCents = Math.max(1, Math.round(marketCapCents / Math.max(1, opts.sharesOutstanding)));

  const breakdown: FactorContribution[] = normalized.map((n) => ({
    factor: n.factor,
    label: n.label,
    weight: Math.round((n.weight / totalWeight) * 1000) / 1000,
    score: Math.round(n.score),
    contributionCents: Math.round((n.weight / totalWeight) * (n.score / 100) * brandCap * scarcityFactor)
  }));
  breakdown.unshift({
    factor: "royaltyDcf",
    label: "Royalty DCF (contracts + sponsors)",
    weight: 1,
    score: 100,
    contributionCents: Math.round(dcfComponentCents * scarcityFactor)
  });

  return { marketCapCents, pricePerShareCents, sharesOutstanding: opts.sharesOutstanding, brandScore: Math.round(brandScore * 10) / 10, dcfComponentCents, brandComponentCents, scarcityFactor: Math.round(scarcityFactor * 1000) / 1000, elasticityFactor: Math.round(elasticityFactor * 1000) / 1000, breakdown };
}

export function formatUsdCents(cents: number): string {
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(2)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}
