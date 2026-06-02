/**
 * Wave 5 creator CRM segmentation primitives.
 *
 * Creators define SegmentDefinitions (predicates over a fan profile) which
 * the creator-crm-service evaluates against in-scope users to produce a
 * MaterializedSegment (a list of userIds). Wave 5 evaluates segments in
 * memory; Wave 6 swaps in a real warehouse query.
 */
export type CollectorTier = "casual" | "engaged" | "high_value" | "vip";

export type SegmentRole = "fan" | "collector" | "creator";

export type SegmentDefinition = {
  role?: SegmentRole;
  minOwnedAssets?: number;
  minWatchlistCount?: number;
  minSpend?: number;
  lastActivityWithinDays?: number;
  noPurchaseWithinDays?: number;
  creatorAffinityId?: string;
  collectorTier?: CollectorTier;
};

/** A profile snapshot the segment evaluator works with. */
export type FanProfile = {
  userId: string;
  role: SegmentRole;
  ownedAssets: number;
  watchlistCount: number;
  totalSpend: number;
  lastActivityDaysAgo: number;
  lastPurchaseDaysAgo: number | null;
  creatorAffinityIds: string[];
  collectorTier: CollectorTier;
};

/** Returns true if the profile satisfies the segment definition. */
export function profileMatches(
  def: SegmentDefinition,
  p: FanProfile
): boolean {
  if (def.role && p.role !== def.role) return false;
  if (def.minOwnedAssets != null && p.ownedAssets < def.minOwnedAssets) return false;
  if (def.minWatchlistCount != null && p.watchlistCount < def.minWatchlistCount) return false;
  if (def.minSpend != null && p.totalSpend < def.minSpend) return false;
  if (def.lastActivityWithinDays != null && p.lastActivityDaysAgo > def.lastActivityWithinDays) return false;
  if (def.noPurchaseWithinDays != null) {
    // "no purchase within X days" → either never purchased, or last purchase older than X.
    if (p.lastPurchaseDaysAgo != null && p.lastPurchaseDaysAgo < def.noPurchaseWithinDays) return false;
  }
  if (def.creatorAffinityId && !p.creatorAffinityIds.includes(def.creatorAffinityId)) return false;
  if (def.collectorTier && p.collectorTier !== def.collectorTier) return false;
  return true;
}

export function evaluateSegment(
  def: SegmentDefinition,
  profiles: FanProfile[]
): string[] {
  return profiles.filter((p) => profileMatches(def, p)).map((p) => p.userId);
}
