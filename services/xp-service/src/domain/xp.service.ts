import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import {
  XP_ACTIONS,
  ANTI_ABUSE,
  progress,
  inviteMultiplier,
  levelFromXp,
  type XpActionKey,
  type Progress
} from "@crownx-jewel/shared-xp";

/**
 * The append-only XP ledger and derived rank. In production this is the
 * `xp_ledger` table (append-only, on-chain-anchored). Here it is in-memory to
 * match the repo's service convention — same API surface, swappable store.
 */

export interface LedgerEntry {
  id: string;
  userId: string;
  action: XpActionKey;
  vxp: number;
  refRenderId: string | null;
  onChainRef: string | null;
  assetId: string | null;
  createdAt: string;
}

export interface RankView extends Progress {
  userId: string;
}

const ledger: LedgerEntry[] = [];
const totals = new Map<string, number>(); // userId -> total VXP

// anti-abuse bookkeeping
const dailyCounts = new Map<string, number>(); // `${userId}:${action}:${yyyy-mm-dd}` -> count
const holdDaysByAsset = new Map<string, number>(); // `${userId}:${assetId}` -> days already credited

const today = () => nowIso().slice(0, 10);
const dayKey = (userId: string, action: string) => `${userId}:${action}:${today()}`;

export interface GrantInput {
  userId: string;
  action: XpActionKey;
  /** multiplier for repeated units (e.g. hold-streak days, unique viewers) */
  units?: number;
  /** explicit multiplier (e.g. invite ×1.5 for VANGUARD+) — overrides auto */
  multiplier?: number;
  assetId?: string;
  refRenderId?: string;
  onChainRef?: string;
}

export interface GrantResult {
  entry: LedgerEntry | null;
  vxpGranted: number;
  capped: boolean;
  reason?: string;
  rank: RankView;
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
}

function rankOf(userId: string): RankView {
  return { userId, ...progress(totals.get(userId) || 0) };
}

export const xpService = {
  /** Grant XP for a value-creating action, enforcing the anti-abuse caps. */
  grant(input: GrantInput): GrantResult {
    const def = XP_ACTIONS[input.action];
    const before = totals.get(input.userId) || 0;
    const fromLevel = levelFromXp(before);

    let units = Math.max(1, Math.floor(input.units ?? 1));
    let capped = false;
    let reason: string | undefined;

    // ---- anti-abuse caps ----
    if (input.action === "hold_streak" && input.assetId) {
      const key = `${input.userId}:${input.assetId}`;
      const already = holdDaysByAsset.get(key) || 0;
      const room = Math.max(0, ANTI_ABUSE.holdStreakCapDays - already);
      if (units > room) {
        units = room;
        capped = true;
        reason = "hold_streak_capped_90d";
      }
      holdDaysByAsset.set(key, already + units);
    }
    if (input.action === "slab_shared") {
      const k = dayKey(input.userId, "slab_shared");
      const used = dailyCounts.get(k) || 0;
      const room = Math.max(0, ANTI_ABUSE.shareGrantsPerDay - used);
      if (units > room) {
        units = room;
        capped = true;
        reason = "share_daily_cap";
      }
      dailyCounts.set(k, used + units);
    }
    if (input.action === "daily_return") {
      const k = dayKey(input.userId, "daily_return");
      if ((dailyCounts.get(k) || 0) >= ANTI_ABUSE.dailyReturnPerDay) {
        return { entry: null, vxpGranted: 0, capped: true, reason: "daily_return_already_claimed", rank: rankOf(input.userId), leveledUp: false, fromLevel, toLevel: fromLevel };
      }
      dailyCounts.set(k, 1);
    }

    if (units <= 0) {
      return { entry: null, vxpGranted: 0, capped: true, reason: reason || "capped", rank: rankOf(input.userId), leveledUp: false, fromLevel, toLevel: fromLevel };
    }

    const mult = input.multiplier ?? 1;
    const vxp = Math.round(def.vxp * units * mult);

    const entry: LedgerEntry = {
      id: newId(),
      userId: input.userId,
      action: input.action,
      vxp,
      refRenderId: input.refRenderId || null,
      onChainRef: input.onChainRef || null,
      assetId: input.assetId || null,
      createdAt: nowIso()
    };
    ledger.push(entry);
    const after = before + vxp;
    totals.set(input.userId, after);
    const toLevel = levelFromXp(after);

    return { entry, vxpGranted: vxp, capped, reason, rank: rankOf(input.userId), leveledUp: toLevel > fromLevel, fromLevel, toLevel };
  },

  /** Convenience for the attribution loop: pay both sides of a converted invite. */
  grantInviteConversion(input: { sharerId: string; sharerLevel: number; inviteeId: string; refRenderId?: string; onChainRef?: string }) {
    const sharer = this.grant({ userId: input.sharerId, action: "invite_converted", multiplier: inviteMultiplier(input.sharerLevel), refRenderId: input.refRenderId, onChainRef: input.onChainRef });
    const invitee = this.grant({ userId: input.inviteeId, action: "invite_bonus", refRenderId: input.refRenderId, onChainRef: input.onChainRef });
    return { sharer, invitee };
  },

  rank: (userId: string): RankView => rankOf(userId),

  ledgerFor: (userId: string): LedgerEntry[] => ledger.filter((e) => e.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  /** Weekly leaderboard (top N by total VXP). */
  leaderboard(limit = 20): Array<{ rank: number; userId: string; xp: number; level: number; tier: string }> {
    return [...totals.entries()]
      .map(([userId, xp]) => ({ userId, ...progress(xp) }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, userId: r.userId, xp: r.xp, level: r.level, tier: r.tier }));
  }
};
