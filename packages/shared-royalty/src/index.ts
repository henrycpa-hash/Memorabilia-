/**
 * @crownx-jewel/shared-royalty — the Royalty Vault split engine.
 *
 * Implements the on-chain 10% royalty mechanics from
 * `CrownX_Royalty_Vault_Contract.docx` (patent #63/704,653): the fixed 10%
 * royalty is split among Originator / Athlete / CrownX per a per-asset scenario
 * + subscription tiers, applied identically at every resale hop. The athlete's
 * slice is HELD in the treasury (earmarked per athlete) until they verify &
 * claim — the acquisition flywheel.
 *
 * The 10% never grows: the athlete slice is carved FROM the 10%, never added
 * on top, so seller economics (nets 90%) stay constant across scenarios.
 * Pure + deterministic so the split is auditable. Shares are bps OF the 10%
 * royalty (10000 = the whole royalty).
 */

export const ROYALTY_RATE_BPS = 1000; // 10.00% of the sale price
export const PROTOCOL_FLOOR_BPS = 500; // CrownX never drops below 5% of the royalty
export const ATHLETE_FIXED_BPS = 1000; // 10% of the royalty in default/donation scenarios

export type Scenario = "default" | "athlete_originated" | "live_authenticated" | "donation";
export type FanTier = "free" | "collector_plus" | "sovereign";
export type AthleteTier = "free" | "pro" | "elite";

export interface Shares {
  /** originator (fan or athlete) share, bps of the royalty */
  origShareBps: number;
  athleteShareBps: number;
  crownxShareBps: number;
}

const FAN_TIER_SHARE: Record<FanTier, number> = { free: 6000, collector_plus: 7500, sovereign: 8500 };
const ATHLETE_ORIG_TIER_SHARE: Record<AthleteTier, number> = { free: 7000, pro: 8000, elite: 9000 };
const LIVE_ATHLETE_TIER_SHARE: Record<AthleteTier, number> = { free: 5000, pro: 6000, elite: 7000 };
const LIVE_FAN_SHARE = 2000;

/**
 * Compute the Originator/Athlete/CrownX split for an asset, honoring the
 * scenario, the fan & athlete subscription tiers, and the invariants.
 */
export function computeShares(scenario: Scenario, fanTier: FanTier = "free", athleteTier: AthleteTier = "free"): Shares {
  let s: Shares;
  switch (scenario) {
    case "athlete_originated": {
      const ath = ATHLETE_ORIG_TIER_SHARE[athleteTier];
      s = { origShareBps: 0, athleteShareBps: ath, crownxShareBps: 10000 - ath };
      break;
    }
    case "live_authenticated": {
      const ath = LIVE_ATHLETE_TIER_SHARE[athleteTier];
      s = { origShareBps: LIVE_FAN_SHARE, athleteShareBps: ath, crownxShareBps: 10000 - LIVE_FAN_SHARE - ath };
      break;
    }
    case "default":
    case "donation":
    default: {
      // fan is originator; athlete's 10% slice is fixed and untouched by tiers
      const fan = FAN_TIER_SHARE[fanTier];
      s = { origShareBps: fan, athleteShareBps: ATHLETE_FIXED_BPS, crownxShareBps: 10000 - fan - ATHLETE_FIXED_BPS };
      break;
    }
  }
  // enforce the protocol floor
  if (s.crownxShareBps < PROTOCOL_FLOOR_BPS) {
    const deficit = PROTOCOL_FLOOR_BPS - s.crownxShareBps;
    // claw back from the discretionary party (originator first, else athlete)
    if (s.origShareBps >= deficit) s.origShareBps -= deficit;
    else s.athleteShareBps -= deficit;
    s.crownxShareBps = PROTOCOL_FLOOR_BPS;
  }
  return s;
}

export interface Settlement {
  salePriceCents: number;
  royaltyCents: number;
  toOriginatorCents: number;
  toAthleteCents: number;
  toCrownxCents: number;
  sellerNetsCents: number;
  shares: Shares;
}

/** Settle a sale: the fixed 10% royalty split + seller nets 90%. */
export function settleSale(salePriceCents: number, shares: Shares): Settlement {
  const royaltyCents = Math.round((salePriceCents * ROYALTY_RATE_BPS) / 10000);
  const toOriginatorCents = Math.round((royaltyCents * shares.origShareBps) / 10000);
  const toAthleteCents = Math.round((royaltyCents * shares.athleteShareBps) / 10000);
  const toCrownxCents = royaltyCents - toOriginatorCents - toAthleteCents;
  return {
    salePriceCents,
    royaltyCents,
    toOriginatorCents,
    toAthleteCents,
    toCrownxCents,
    sellerNetsCents: salePriceCents - royaltyCents,
    shares
  };
}

/** Default (un-subscribed) shares for a scenario — used by lapse reversion. */
export function defaultShares(scenario: Scenario): Shares {
  return computeShares(scenario, "free", "free");
}

/** Validate the invariants (sum to 10000, floor honored). */
export function checkInvariants(s: Shares): boolean {
  return s.origShareBps + s.athleteShareBps + s.crownxShareBps === 10000 && s.crownxShareBps >= PROTOCOL_FLOOR_BPS;
}

export const SCENARIOS: { id: Scenario; label: string; when: string }[] = [
  { id: "default", label: "Default (fan-originated)", when: "Fan captures & mints; athlete's 10% held for marketing until claimed" },
  { id: "athlete_originated", label: "Athlete-originated", when: "Athlete uploads & authenticates first-party (starts claimed)" },
  { id: "live_authenticated", label: "Live-authenticated", when: "In-person biometric signing or accepted verify invite (24–72h)" },
  { id: "donation", label: "Tax-donation", when: "Default split, athlete leaves their 10% unclaimed — charitable record" }
];

export function formatUsdCents(cents: number): string {
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(2)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}
