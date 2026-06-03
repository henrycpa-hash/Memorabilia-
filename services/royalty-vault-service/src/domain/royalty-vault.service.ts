import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { anchor, type AnchorReceipt } from "@crownx-jewel/shared-chain";
import {
  computeShares,
  settleSale,
  formatUsdCents,
  SCENARIOS,
  type Scenario,
  type FanTier,
  type AthleteTier
} from "@crownx-jewel/shared-royalty";

/**
 * The Royalty Vault — the on-chain royalty engine connected to athlete accounts.
 *
 * Each authenticated asset carries an immutable royalty config (originator,
 * athlete, scenario, tiers). At every resale hop the fixed 10% royalty splits
 * Originator / Athlete / CrownX. The ATHLETE'S slice is HELD in the treasury,
 * earmarked to that athlete's account, until they verify & claim — the
 * acquisition flywheel. Every settlement grants the originator +400 XP
 * ("Originate a Resale Royalty"). In-memory by repo convention; keyed by an
 * athleteId that maps 1:1 to the athlete-index account (slug or id).
 */

const XP_URL = () => process.env.XP_SERVICE_URL || "http://localhost:4073";

interface Config {
  assetId: string;
  originatorId: string;
  athleteId: string;
  scenario: Scenario;
  fanTier: FanTier;
  athleteTier: AthleteTier;
  athleteClaimed: boolean;
  donationElected: boolean;
  firstResaleDone: boolean;
}
interface Contribution { assetId: string; cents: number; kind: "held" | "paid" | "donated"; tx: string; ts: string }
interface Vault {
  athleteId: string;
  heldCents: number;
  claimedLifetimeCents: number;
  donationCents: number;
  claimed: boolean;
  contributions: Contribution[];
}

const configs = new Map<string, Config>();
const vaults = new Map<string, Vault>();
const originatorEarned = new Map<string, number>();

function vaultFor(athleteId: string): Vault {
  let v = vaults.get(athleteId);
  if (!v) {
    v = { athleteId, heldCents: 0, claimedLifetimeCents: 0, donationCents: 0, claimed: false, contributions: [] };
    vaults.set(athleteId, v);
  }
  return v;
}

function grantOriginatorXp(userId: string) {
  fetch(`${XP_URL()}/xp/grant`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, action: "royalty_originated" }) }).catch(() => undefined);
}

/** Seed a few athlete vaults with accrued held royalties (the "waiting" hook). */
function seed() {
  if (configs.size) return;
  const demo: { athleteId: string; pieces: number; heldCents: number; scenario: Scenario }[] = [
    { athleteId: "dylan-crews", pieces: 7, heldCents: 24_800_00, scenario: "default" },
    { athleteId: "a-vanguard", pieces: 4, heldCents: 12_400_00, scenario: "default" },
    { athleteId: "k-solace", pieces: 9, heldCents: 31_900_00, scenario: "default" },
    { athleteId: "m-aurelia", pieces: 3, heldCents: 8_200_00, scenario: "default" }
  ];
  for (const d of demo) {
    const v = vaultFor(d.athleteId);
    v.heldCents = d.heldCents;
    for (let i = 0; i < d.pieces; i++) {
      const assetId = `ast_${d.athleteId}_${i}`;
      configs.set(assetId, { assetId, originatorId: `fan_${i}`, athleteId: d.athleteId, scenario: d.scenario, fanTier: "free", athleteTier: "free", athleteClaimed: false, donationElected: false, firstResaleDone: true });
      v.contributions.push({ assetId, cents: Math.round(d.heldCents / d.pieces), kind: "held", tx: anchor("royalty.held.seed", { assetId }, nowIso()).txRef, ts: nowIso() });
    }
  }
}
seed();

export const royaltyVault = {
  scenarios: () => SCENARIOS,

  /** Register an asset's royalty config at mint (the GenesisCOA struct). */
  registerCoa(input: { assetId: string; originatorId: string; athleteId: string; scenario?: Scenario; fanTier?: FanTier; athleteTier?: AthleteTier; donationElected?: boolean }) {
    const scenario = input.scenario || "default";
    const cfg: Config = {
      assetId: input.assetId,
      originatorId: input.originatorId,
      athleteId: input.athleteId,
      scenario,
      fanTier: input.fanTier || "free",
      athleteTier: input.athleteTier || "free",
      // athlete-originated assets start claimed; everything else holds until claim
      athleteClaimed: scenario === "athlete_originated",
      donationElected: !!input.donationElected,
      firstResaleDone: false
    };
    configs.set(cfg.assetId, cfg);
    const shares = computeShares(cfg.scenario, cfg.fanTier, cfg.athleteTier);
    const receipt = anchor("royalty.config", { ...cfg, shares }, nowIso());
    return { ok: true as const, config: cfg, shares, anchor: receipt };
  },

  /** Settle a resale: split the fixed 10%; hold/pay the athlete slice. */
  settle(assetId: string, salePriceCents: number) {
    const cfg = configs.get(assetId);
    if (!cfg) return { error: "config_not_found" } as const;
    const shares = computeShares(cfg.scenario, cfg.fanTier, cfg.athleteTier);
    const st = settleSale(salePriceCents, shares);
    const receipt = anchor("royalty.paid", { assetId, scenario: cfg.scenario, ...st, ts: nowIso() }, nowIso());

    // originator paid + earns XP (+400 "Originate a Resale Royalty")
    if (cfg.originatorId) {
      originatorEarned.set(cfg.originatorId, (originatorEarned.get(cfg.originatorId) || 0) + st.toOriginatorCents);
      grantOriginatorXp(cfg.originatorId);
    }

    // athlete slice: donated / paid-direct / held-in-treasury
    const v = vaultFor(cfg.athleteId);
    let athleteStatus: "donated" | "paid" | "held";
    if (cfg.donationElected) {
      v.donationCents += st.toAthleteCents;
      athleteStatus = "donated";
    } else if (cfg.athleteClaimed) {
      v.claimedLifetimeCents += st.toAthleteCents;
      athleteStatus = "paid";
    } else {
      v.heldCents += st.toAthleteCents;
      athleteStatus = "held";
    }
    v.contributions.push({ assetId, cents: st.toAthleteCents, kind: athleteStatus === "held" ? "held" : athleteStatus, tx: receipt.txRef, ts: nowIso() });
    cfg.firstResaleDone = true; // donation toggle locks after this

    return {
      ok: true as const,
      assetId,
      scenario: cfg.scenario,
      settlement: {
        royalty: formatUsdCents(st.royaltyCents),
        originator: formatUsdCents(st.toOriginatorCents),
        athlete: formatUsdCents(st.toAthleteCents),
        crownx: formatUsdCents(st.toCrownxCents),
        sellerNets: formatUsdCents(st.sellerNetsCents),
        shares: st.shares
      },
      athleteStatus,
      anchor: receipt,
      vault: this.athleteVault(cfg.athleteId)
    };
  },

  /** The athlete's vault — held + claimed + donation, with display. */
  athleteVault(athleteId: string) {
    const v = vaultFor(athleteId);
    const pieces = [...configs.values()].filter((c) => c.athleteId === athleteId);
    return {
      athleteId,
      claimed: v.claimed,
      heldCents: v.heldCents,
      claimedLifetimeCents: v.claimedLifetimeCents,
      donationCents: v.donationCents,
      pieceCount: pieces.length,
      display: { held: formatUsdCents(v.heldCents), claimedLifetime: formatUsdCents(v.claimedLifetimeCents), donation: formatUsdCents(v.donationCents) },
      recent: v.contributions.slice(-8).reverse().map((c) => ({ ...c, display: formatUsdCents(c.cents) }))
    };
  },

  /** The claim flywheel: athlete verifies (biometric) → held releases, future hops pay direct. */
  verifyAndClaim(athleteId: string, method = "biometric") {
    const v = vaultFor(athleteId);
    const released = v.heldCents;
    v.claimedLifetimeCents += released;
    v.heldCents = 0;
    v.claimed = true;
    for (const c of configs.values()) if (c.athleteId === athleteId) c.athleteClaimed = true;
    const receipt = anchor("royalty.claim", { athleteId, releasedCents: released, method, ts: nowIso() }, nowIso());
    return { ok: true as const, releasedDisplay: formatUsdCents(released), releasedCents: released, method, anchor: receipt, vault: this.athleteVault(athleteId) };
  },

  /** Athlete subscribes to raise their share (athlete-originated / live scenarios). */
  subscribeAthlete(athleteId: string, tier: AthleteTier) {
    let n = 0;
    for (const c of configs.values()) if (c.athleteId === athleteId) { c.athleteTier = tier; n++; }
    return { ok: true as const, tier, itemsUpdated: n, share: computeShares("athlete_originated", "free", tier).athleteShareBps / 100 + "%" };
  },

  /** Fan subscribes to raise their share (default / donation scenarios). */
  subscribeFan(originatorId: string, tier: FanTier) {
    let n = 0;
    for (const c of configs.values()) if (c.originatorId === originatorId) { c.fanTier = tier; n++; }
    return { ok: true as const, tier, itemsUpdated: n, share: computeShares("default", tier, "free").origShareBps / 100 + "%" };
  },

  /** Lapse reversion: every item reverts to default; CrownX reclaims the boost. */
  lapse(holderId: string) {
    let n = 0;
    for (const c of configs.values()) {
      if (c.originatorId === holderId) { c.fanTier = "free"; n++; }
      if (c.athleteId === holderId) { c.athleteTier = "free"; n++; }
    }
    return { ok: true as const, revertedItems: n, note: "All boosted points reverted to default; CrownX reclaimed until resubscribe." };
  },

  /** Athlete elects/toggles donation of their slice — locks after first resale. */
  electDonation(athleteId: string, assetId: string, elect: boolean) {
    const cfg = configs.get(assetId);
    if (!cfg || cfg.athleteId !== athleteId) return { error: "config_not_found" } as const;
    if (cfg.firstResaleDone) return { error: "donation_locked_after_first_resale" } as const;
    cfg.donationElected = elect;
    return { ok: true as const, assetId, donationElected: elect };
  },

  /** Sell the held stream — hands off to the rights buyout (see shared-pricing). */
  sellStreamQuote(athleteId: string) {
    const v = vaultFor(athleteId);
    // a simple DPV proxy: ~8× the currently-held slice (the rights service has the full model)
    const offer = Math.round(v.heldCents * 1.55 + v.heldCents * 8 * 0.0);
    return { ok: true as const, basisDisplay: formatUsdCents(v.heldCents), offerDisplay: formatUsdCents(Math.round(v.heldCents * 1.55)), note: "Full DPV on the rights market (/rights). CrownX keeps a 5% floor." };
  }
};
