/**
 * CrownX — The /LV99 Status Economy (canonical, source of truth).
 *
 * Transcribed verbatim from `CrownX_LV99_Economy.docx`. Shared by the client
 * (status page, feed badges) and the xp-service so rank is computed identically
 * everywhere. XP cannot be bought — only earned through value-creating protocol
 * actions; the ledger is append-only and on-chain-anchored, so rank is auditable.
 */

export const MAX_LEVEL = 99;

/** Cumulative VXP required to REACH level N. round(60 * N^1.95). */
export function cumulativeXpForLevel(n: number): number {
  if (n <= 1) return 60;
  return Math.round(60 * Math.pow(n, 1.95));
}

/** Resolve a total VXP to a level 1..99. */
export function levelFromXp(xp: number): number {
  if (xp < cumulativeXpForLevel(1)) return 1;
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= cumulativeXpForLevel(lvl + 1)) lvl++;
  return lvl;
}

/* ----------------------------------------------------------- Tiers (7) */

export type TierName =
  | "INITIATE"
  | "COLLECTOR"
  | "CURATOR"
  | "VANGUARD"
  | "ASCENDANT"
  | "SOVEREIGN"
  | "CROWN";

export interface Tier {
  name: TierName;
  minLevel: number;
  maxLevel: number;
  unlocks: string[];
}

export const TIERS: Tier[] = [
  { name: "INITIATE", minLevel: 1, maxLevel: 9, unlocks: ["Mint + authenticate (Genesis COA)", "Public marketplace", "Profile with level badge", "First-mint bonus"] },
  { name: "COLLECTOR", minLevel: 10, maxLevel: 24, unlocks: ["Collections + set-completion XP", "Royalty earnings dashboard", "Custom slab display case", "Priority support"] },
  { name: "CURATOR", minLevel: 25, maxLevel: 44, unlocks: ["Early access (1h ahead)", "Reduced marketplace fees", "Verified Curator badge", "Host themed sets"] },
  { name: "VANGUARD", minLevel: 45, maxLevel: 69, unlocks: ["Early access (3h ahead)", "Floor Boost (pinned listings)", "1.5× invite XP", "Vanguard-only drops"] },
  { name: "ASCENDANT", minLevel: 70, maxLevel: 89, unlocks: ["6h early access", "Lowest fee band", "Royalty yield boost", "Animated slab frames"] },
  { name: "SOVEREIGN", minLevel: 90, maxLevel: 98, unlocks: ["Founder 1/1 drops", "Guaranteed whitelist", "Co-sign authentication", "Concierge + physical custody"] },
  { name: "CROWN", minLevel: 99, maxLevel: 99, unlocks: ["Vault Council governance", "Royalty Vault treasury share", "1-of-1 Crown identity slab", "Founders Ledger engraving"] }
];

export function tierForLevel(level: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (level >= tier.minLevel) t = tier;
  return t;
}

/** VANGUARD+ (LV45+) earn a 1.5× multiplier on converted-invite XP. */
export function inviteMultiplier(sharerLevel: number): number {
  return sharerLevel >= 45 ? 1.5 : 1;
}

export interface Progress {
  xp: number;
  level: number;
  tier: TierName;
  /** 0–100 progress toward the next level */
  pct: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNext: number;
}

export function progress(xp: number): Progress {
  const level = levelFromXp(xp);
  const tier = tierForLevel(level).name;
  if (level >= MAX_LEVEL) {
    return { xp, level, tier, pct: 100, xpIntoLevel: 0, xpForNextLevel: 0, xpToNext: 0 };
  }
  const base = cumulativeXpForLevel(level);
  const next = cumulativeXpForLevel(level + 1);
  const span = next - base || 1;
  const into = xp - base;
  return {
    xp,
    level,
    tier,
    pct: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    xpIntoLevel: into,
    xpForNextLevel: span,
    xpToNext: next - xp
  };
}

/* ------------------------------------------------------ XP earn actions */

export type XpActionKey =
  | "mint_standard"
  | "mint_top"
  | "first_mint"
  | "hold_streak"
  | "royalty_originated"
  | "royalty_recirculated"
  | "invite_converted"
  | "invite_bonus" // the +500 the invitee receives on their first mint
  | "slab_shared"
  | "sale_completed"
  | "daily_return"
  | "set_completed"
  | "governance_vote";

export interface XpAction {
  key: XpActionKey;
  label: string;
  vxp: number;
  cadence: string;
  note: string;
}

export const XP_ACTIONS: Record<XpActionKey, XpAction> = {
  mint_standard: { key: "mint_standard", label: "Authenticated Mint", vxp: 250, cadence: "per mint", note: "Mint any asset with a Genesis COA." },
  mint_top: { key: "mint_top", label: "Top-Grade Mint (1/1 or Grade 10)", vxp: 1200, cadence: "per mint", note: "Top-grade pull — dopamine + status spike." },
  first_mint: { key: "first_mint", label: "First Mint Ever", vxp: 500, cadence: "one-time", note: "Onboarding bonus past the activation cliff." },
  hold_streak: { key: "hold_streak", label: "Hold Streak", vxp: 15, cadence: "per asset / day held", note: "Diamond hands. Caps at 90 days/asset." },
  royalty_originated: { key: "royalty_originated", label: "Originate a Resale Royalty", vxp: 400, cadence: "per downstream resale", note: "Earn XP AND cash each time your asset resells." },
  royalty_recirculated: { key: "royalty_recirculated", label: "Royalty Recirculation", vxp: 300, cadence: "per re-minted payout", note: "Rewards keeping value in the ecosystem." },
  invite_converted: { key: "invite_converted", label: "Verified Friend Invite", vxp: 800, cadence: "per converted invite", note: "Only on a genuine first-mint conversion." },
  invite_bonus: { key: "invite_bonus", label: "Friend Pack (invitee)", vxp: 500, cadence: "on first mint", note: "The sealed-pack reward for the invited friend." },
  slab_shared: { key: "slab_shared", label: "Slab Shared Off-Platform", vxp: 60, cadence: "per unique external viewer", note: "Caps daily to prevent spam-sharing." },
  sale_completed: { key: "sale_completed", label: "Marketplace Sale Completed", vxp: 120, cadence: "per sale", note: "Liquidity is health." },
  daily_return: { key: "daily_return", label: "Daily Return", vxp: 25, cadence: "per consecutive day", note: "Light habit reinforcement." },
  set_completed: { key: "set_completed", label: "Collection Set Completed", vxp: 2000, cadence: "per themed set", note: "Drives chase + long-tail collecting." },
  governance_vote: { key: "governance_vote", label: "Governance Vote (Vault Council)", vxp: 150, cadence: "per vote", note: "Keeps the Crown tier in stewardship." }
};

export const XP_ACTION_LIST: XpAction[] = Object.values(XP_ACTIONS);

/* --------------------------------------------------------- Anti-abuse */

export const ANTI_ABUSE = {
  /** hold-streak XP caps at 90 days per asset */
  holdStreakCapDays: 90,
  /** unique-viewer share grants capped per day */
  shareGrantsPerDay: 25,
  /** daily_return is once per calendar day */
  dailyReturnPerDay: 1,
  /** invite XP releases only on the invitee's first COA mint */
  inviteRequiresConversion: true
} as const;
