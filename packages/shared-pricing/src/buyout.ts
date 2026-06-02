/**
 * CrownX — Royalty Buyout pricing (the "buyouts of royalties is different"
 * dimension).
 *
 * A buyout is a SEPARATE, one-time transaction (not a subscription line): the
 * collector sells the present value of their future lifetime-royalty stream for
 * a lump sum. This is distinct from the subscription fee and from the
 * royalty-keep add-on — it is its own priced product.
 *
 * The quote is a deterministic discounted-cash-flow of the projected royalty
 * income. Discount rate, growth, and horizon are configurable business inputs;
 * higher tiers receive a better (lower) discount rate — a perk, never a change
 * to the 10% rate or to the locked settlement/fee logic.
 */

import { CONSUMER_TIERS, type ConsumerTierKey, formatUsdCents } from "./tiers";
import { effectiveKeepBps } from "./royalties";

export interface BuyoutInput {
  /** the collector's realized royalty income over the trailing 12 months, in cents */
  trailing12moRoyaltyCents: number;
  tier: ConsumerTierKey;
  /** purchased royalty-keep add-on, if any (affects projected income) */
  keepAddonKey?: string;
  /** expected annual growth of royalty income, decimal (e.g. 0.08 = 8%). Default 0.06 */
  expectedAnnualGrowth?: number;
  /** projection horizon in years (lifetime royalty is perpetual; we cap the model). Default 10 */
  horizonYears?: number;
}

export interface BuyoutQuote {
  offerCents: number;
  /** undiscounted projected royalty income over the horizon, in cents */
  projectedIncomeCents: number;
  discountAnnualRate: number;
  expectedAnnualGrowth: number;
  horizonYears: number;
  keepBps: number;
  effectiveMultiple: number; // offer ÷ trailing-12mo income
  display: { offer: string; projectedIncome: string };
}

/** Tier-based annual discount rate applied to the buyout DCF (lower = better offer). */
function discountRateForTier(tier: ConsumerTierKey): number {
  switch (tier) {
    case "legacy":
      return 0.12;
    case "premium":
      return 0.16;
    case "free":
    default:
      return 0.22;
  }
}

/**
 * Quote a lifetime-royalty buyout. Deterministic: same inputs → same offer.
 *
 *   PV = Σ (t=1..H)  income_0 · (1+g)^t / (1+r)^t
 *
 * income_0 is the trailing-12mo income scaled to the collector's effective keep
 * (a higher keep means a larger stream, so a larger buyout).
 */
export function quoteRoyaltyBuyout(input: BuyoutInput): BuyoutQuote {
  const tier = CONSUMER_TIERS[input.tier];
  const keepBps = effectiveKeepBps(input.tier, input.keepAddonKey);
  const g = input.expectedAnnualGrowth ?? 0.06;
  const r = discountRateForTier(input.tier);
  const horizonYears = Math.max(1, Math.min(30, input.horizonYears ?? 10));

  // baseline income already reflects whatever keep produced the trailing figure;
  // re-scale to the *effective* keep so a freshly-purchased boost is priced in.
  const baselineKeep = tier.baseRoyaltyKeepBps || 1;
  const income0 = Math.round((input.trailing12moRoyaltyCents * keepBps) / baselineKeep);

  let pv = 0;
  let projected = 0;
  for (let t = 1; t <= horizonYears; t++) {
    const incomeT = income0 * Math.pow(1 + g, t);
    projected += incomeT;
    pv += incomeT / Math.pow(1 + r, t);
  }

  const offerCents = Math.round(pv);
  const projectedIncomeCents = Math.round(projected);
  const effectiveMultiple = input.trailing12moRoyaltyCents > 0 ? offerCents / input.trailing12moRoyaltyCents : 0;

  return {
    offerCents,
    projectedIncomeCents,
    discountAnnualRate: r,
    expectedAnnualGrowth: g,
    horizonYears,
    keepBps,
    effectiveMultiple: Math.round(effectiveMultiple * 100) / 100,
    display: { offer: formatUsdCents(offerCents), projectedIncome: formatUsdCents(projectedIncomeCents) }
  };
}
