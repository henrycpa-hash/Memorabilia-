/**
 * CrownX — Royalty-keep pricing (the "better royalties" dimension).
 *
 * The 10% lifetime resale royalty is fixed (see tiers.LIFETIME_ROYALTY_RATE_BPS).
 * What changes — and what is PRICED SEPARATELY from the subscription — is the
 * collector's *share of that 10%*. This is the user's "pricing for better
 * royalties is different pricing": a stackable monthly add-on, on top of the
 * subscription, that raises your keep up to the tier's cap (platform max 85%).
 *
 * All keep values are basis points OF THE 10% royalty (10000 = the entire 10%).
 * These add-on prices are configurable business inputs (sensible defaults here),
 * distinct from the doc-authoritative subscription numbers in tiers.ts.
 */

import { CONSUMER_TIERS, type ConsumerTierKey, LIFETIME_ROYALTY_RATE_BPS } from "./tiers";

/** Platform-wide ceiling on the collector's share of the 10% royalty. */
export const MAX_ROYALTY_KEEP_BPS = 8500; // 85% of the 10%

export interface RoyaltyKeepAddon {
  key: string;
  name: string;
  /** resulting collector keep, in bps of the 10% royalty */
  keepBps: number;
  /** monthly price in cents, charged ON TOP of the subscription */
  monthlyPriceCents: number;
  /** tiers eligible to purchase this add-on */
  eligibleTiers: ConsumerTierKey[];
}

/**
 * Royalty-keep ladder. Each step is an optional paid upgrade; a collector can
 * hold at most one. `keepBps` is gated by each tier's `maxRoyaltyKeepBps`.
 */
export const ROYALTY_KEEP_ADDONS: RoyaltyKeepAddon[] = [
  { key: "keep_70", name: "Keep 70%", keepBps: 7000, monthlyPriceCents: 0, eligibleTiers: ["premium", "legacy"] },
  { key: "keep_80", name: "Keep 80%", keepBps: 8000, monthlyPriceCents: 499, eligibleTiers: ["premium", "legacy"] },
  { key: "keep_85", name: "Keep 85% (max)", keepBps: 8500, monthlyPriceCents: 999, eligibleTiers: ["legacy"] }
];

/** Add-ons a tier may purchase, capped by its `maxRoyaltyKeepBps`. */
export function availableKeepAddons(tier: ConsumerTierKey): RoyaltyKeepAddon[] {
  const cap = CONSUMER_TIERS[tier].maxRoyaltyKeepBps;
  return ROYALTY_KEEP_ADDONS.filter((a) => a.eligibleTiers.includes(tier) && a.keepBps <= cap);
}

/** Effective keep = the higher of the tier baseline and any purchased add-on, capped. */
export function effectiveKeepBps(tier: ConsumerTierKey, addonKey?: string): number {
  const t = CONSUMER_TIERS[tier];
  let keep = t.baseRoyaltyKeepBps;
  if (addonKey) {
    const addon = ROYALTY_KEEP_ADDONS.find((a) => a.key === addonKey && a.eligibleTiers.includes(tier));
    if (addon) keep = Math.max(keep, addon.keepBps);
  }
  return Math.min(keep, t.maxRoyaltyKeepBps, MAX_ROYALTY_KEEP_BPS);
}

export interface RoyaltySplit {
  /** gross resale price in cents this split is computed against */
  resalePriceCents: number;
  /** total 10% royalty pool in cents */
  royaltyPoolCents: number;
  /** collector's take in cents */
  collectorCents: number;
  /** remainder shared by athlete + CrownX (per asset royalty_config) in cents */
  athleteAndPlatformCents: number;
  keepBps: number;
}

/**
 * Split a resale's 10% royalty given a collector keep. The athlete/CrownX split
 * of the remainder is governed per-asset by `royalty_config` in the settlement
 * engine — this function only computes the collector's keep vs. the remainder,
 * and NEVER changes the 10% rate itself.
 */
export function computeRoyaltySplit(resalePriceCents: number, keepBps: number): RoyaltySplit {
  const royaltyPoolCents = Math.round((resalePriceCents * LIFETIME_ROYALTY_RATE_BPS) / 10000);
  const collectorCents = Math.round((royaltyPoolCents * keepBps) / 10000);
  return {
    resalePriceCents,
    royaltyPoolCents,
    collectorCents,
    athleteAndPlatformCents: royaltyPoolCents - collectorCents,
    keepBps
  };
}
