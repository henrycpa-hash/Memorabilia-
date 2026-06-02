/**
 * CrownX — Royalty-Rights market + stream-sale pricing.
 *
 * Ports `crownx-royalty-rights.html`: the "Sell or Pool Your Rights" surface.
 * This is the floor/velocity/appreciation flavour of a royalty buyout (the
 * pricing-page `buyout.ts` is the simpler trailing-income flavour). Both are
 * "buyout" math; this one drives the rights MARKET (per-item + pooled streams).
 *
 * A buyout = the discounted present value of an asset's future royalty stream.
 * Selling transfers that stream to a buyer; CrownX keeps a 5% floor of every
 * future payout. Subscriptions unlock +share per item, with a LAPSE rule.
 *
 * Eligibility: a fan may sell an asset's FULL royalty only if they are the sole
 * originator (no athlete on the upload). Athlete-involved assets route through
 * the athlete claim funnel instead.
 */

export const ROYALTY_RATE = 0.1; // the fixed 10% lifetime resale royalty
export const DEFAULT_DISCOUNT_RATE = 0.2; // 20% annual discount on the DCF
export const DEFAULT_HORIZON_YEARS = 10;
export const CROWNX_BUYOUT_FLOOR_BPS = 500; // CrownX keeps 5% of every future payout post-sale

export interface StreamInput {
  /** current floor price of the asset, in cents */
  floorCents: number;
  /** collector's share of the 10% royalty, in bps (6000 = 60% of the 10%) */
  shareBps: number;
  /** expected resales per year (e.g. 0.8) */
  resaleVelocityPerYear: number;
  /** annual appreciation of the floor, decimal (0.15 = 15%) */
  annualAppreciation: number;
  discountRate?: number;
  horizonYears?: number;
}

/** Discounted present value of the future royalty stream, in cents. */
export function streamDpvCents(input: StreamInput): number {
  const disc = input.discountRate ?? DEFAULT_DISCOUNT_RATE;
  const years = input.horizonYears ?? DEFAULT_HORIZON_YEARS;
  const share = input.shareBps / 10000;
  let pv = 0;
  let price = input.floorCents;
  for (let t = 1; t <= years; t++) {
    price *= 1 + input.annualAppreciation;
    pv += (input.resaleVelocityPerYear * price * ROYALTY_RATE * share) / Math.pow(1 + disc, t);
  }
  return Math.round(pv);
}

/** Undiscounted nominal income over the horizon (the "if you hold" figure). */
export function streamNominalCents(input: StreamInput): number {
  const years = input.horizonYears ?? DEFAULT_HORIZON_YEARS;
  const share = input.shareBps / 10000;
  let sum = 0;
  let price = input.floorCents;
  for (let t = 1; t <= years; t++) {
    price *= 1 + input.annualAppreciation;
    sum += input.resaleVelocityPerYear * price * ROYALTY_RATE * share;
  }
  return Math.round(sum);
}

export type StreamSaleMode = "lump" | "short_term";

export interface StreamSaleQuote {
  mode: StreamSaleMode;
  fmvCents: number; // lump-sum buyout (DPV) paid now
  nominalHoldCents: number; // 10y nominal if you keep holding
  /** DPV of the extra 5% share a subscription unlocks (shown as the sub's value) */
  subscriptionExtraValueCents: number;
  crownxFloorBps: number;
  display: { fmv: string; nominalHold: string; subscriptionExtra: string };
}

function usd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function quoteStreamSale(input: StreamInput & { mode?: StreamSaleMode }): StreamSaleQuote {
  const fmvCents = streamDpvCents(input);
  const nominalHoldCents = streamNominalCents(input);
  // value of the +5% share a paid sub unlocks, same DCF at 500bps
  const subscriptionExtraValueCents = streamDpvCents({ ...input, shareBps: 500 });
  return {
    mode: input.mode ?? "lump",
    fmvCents,
    nominalHoldCents,
    subscriptionExtraValueCents,
    crownxFloorBps: CROWNX_BUYOUT_FLOOR_BPS,
    display: { fmv: usd(fmvCents), nominalHold: usd(nominalHoldCents), subscriptionExtra: usd(subscriptionExtraValueCents) }
  };
}

/**
 * Lapse rule: if a subscription lapses, every listed item reverts to its
 * default share — CrownX reclaims the boosted points across the whole catalog
 * until the user resubscribes.
 */
export const SUBSCRIPTION_LAPSE_RULE =
  "Stop paying and every item you have listed reverts to its default share — CrownX reclaims the boosted points across your whole catalog until you resubscribe.";

export interface RightsListing {
  id: string;
  icon: string;
  name: string;
  meta: string;
  priceCents: number;
  impliedYieldPct: number;
  pooled?: boolean;
  /** only sole-originator assets are sellable in full */
  soleOriginator: boolean;
}

/** Sample secondary-market listings (per-item + a diversified pool). */
export const SAMPLE_RIGHTS_MARKET: RightsListing[] = [
  { id: "r1", icon: "🎴", name: "Game-Worn Jersey · 1/1", meta: "FLOOR $42K · 0.9×/yr", priceCents: 1820000, impliedYieldPct: 24, soleOriginator: true },
  { id: "r2", icon: "⚾", name: "Signed Championship Ball", meta: "FLOOR $38K · 1.2×/yr", priceCents: 2140000, impliedYieldPct: 22, soleOriginator: true },
  { id: "r3", icon: "📦", name: "Rookie-Season Pool (6 assets)", meta: "DIVERSIFIED · LOWER RISK", priceCents: 6480000, impliedYieldPct: 19, pooled: true, soleOriginator: true },
  { id: "r4", icon: "🥊", name: "Title-Fight Glove · 1/1", meta: "FLOOR $90K · 0.6×/yr", priceCents: 3190000, impliedYieldPct: 26, soleOriginator: true }
];
