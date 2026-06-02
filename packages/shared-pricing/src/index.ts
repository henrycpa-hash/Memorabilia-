/**
 * @crownx-jewel/shared-pricing — the CONSUMER pricing surface.
 *
 * Three distinct, stacking price dimensions ("all additions to the price"):
 *   1. subscription   (tiers.ts)      — monthly tier fee
 *   2. royalty-keep   (royalties.ts)  — paid add-on raising your share of the 10%
 *   3. royalty buyout (buyout.ts)     — separate lump-sum DCF transaction
 *
 * Separate from — and never modifying — the enterprise billing in
 * @crownx-jewel/shared-billing (PRICING-LOCK).
 */
export * from "./tiers";
export * from "./royalties";
export * from "./buyout";
export * from "./rights";

import { CONSUMER_TIERS, formatUsdCents, type ConsumerTierKey } from "./tiers";
import { ROYALTY_KEEP_ADDONS, effectiveKeepBps } from "./royalties";

export interface PriceLineItem {
  label: string;
  detail?: string;
  /** recurring monthly cents (0 for one-time-only lines) */
  monthlyCents: number;
  /** one-time cents (e.g. a buyout), null when not applicable */
  oneTimeCents?: number | null;
  kind: "subscription" | "royalty_keep" | "mint_fee" | "buyout";
}

export interface PriceBreakdown {
  tier: ConsumerTierKey;
  keepBps: number;
  lineItems: PriceLineItem[];
  monthlyTotalCents: number;
  oneTimeTotalCents: number;
  display: { monthlyTotal: string; oneTimeTotal: string };
}

/**
 * Compose a transparent breakdown of everything a collector is paying:
 * the base subscription, an optional royalty-keep add-on, the per-mint fee
 * (shown for reference), and an optional one-time royalty buyout.
 */
export function composePriceBreakdown(input: {
  tier: ConsumerTierKey;
  keepAddonKey?: string;
  buyoutOfferCents?: number;
}): PriceBreakdown {
  const tier = CONSUMER_TIERS[input.tier];
  const keepBps = effectiveKeepBps(input.tier, input.keepAddonKey);
  const lineItems: PriceLineItem[] = [];

  lineItems.push({
    label: `${tier.name} subscription`,
    detail: tier.tagline,
    monthlyCents: tier.monthlyPriceCents,
    kind: "subscription"
  });

  if (input.keepAddonKey) {
    const addon = ROYALTY_KEEP_ADDONS.find((a) => a.key === input.keepAddonKey);
    if (addon) {
      lineItems.push({
        label: `Royalty keep — ${addon.name}`,
        detail: `Keep ${(addon.keepBps / 100).toFixed(0)}% of the 10% lifetime royalty`,
        monthlyCents: addon.monthlyPriceCents,
        kind: "royalty_keep"
      });
    }
  }

  lineItems.push({
    label: "Minting fee",
    detail: `${formatUsdCents(tier.mintFeeCents)} per COA (charged on mint)`,
    monthlyCents: 0,
    kind: "mint_fee"
  });

  if (input.buyoutOfferCents && input.buyoutOfferCents > 0) {
    lineItems.push({
      label: "Royalty buyout",
      detail: "One-time lump sum for your future royalty stream",
      monthlyCents: 0,
      oneTimeCents: input.buyoutOfferCents,
      kind: "buyout"
    });
  }

  const monthlyTotalCents = lineItems.reduce((a, l) => a + l.monthlyCents, 0);
  const oneTimeTotalCents = lineItems.reduce((a, l) => a + (l.oneTimeCents || 0), 0);

  return {
    tier: input.tier,
    keepBps,
    lineItems,
    monthlyTotalCents,
    oneTimeTotalCents,
    display: { monthlyTotal: formatUsdCents(monthlyTotalCents), oneTimeTotal: formatUsdCents(oneTimeTotalCents) }
  };
}
