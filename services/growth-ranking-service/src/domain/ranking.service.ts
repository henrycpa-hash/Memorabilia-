import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { rankingRepo, type AssetRanking } from "../repo/ranking.repo";

/**
 * Wave 3 trending-score weights (per the spec):
 *
 *   story page view      +1
 *   watchlist add        +5
 *   share click          +4
 *   offer submit         +6
 *   bid place            +8
 *   sale complete       +15
 *
 * Wave 4 layers in 2-5%/24h decay; Wave 3 keeps it simple and additive.
 */
const SCORE_WEIGHTS = {
  view: 1,
  watchlist: 5,
  share: 4,
  offer: 6,
  bid: 8,
  sale: 15
} as const;

export type SignalType = keyof typeof SCORE_WEIGHTS;

export const rankingService = {
  async record(assetId: string, signal: SignalType): Promise<AssetRanking> {
    const existing = rankingRepo.find(assetId);
    const base: AssetRanking = existing
      ? { ...existing }
      : {
          assetId,
          trendingScore: "0.0000",
          watchlistCount: 0,
          viewCount: 0,
          bidCount: 0,
          shareCount: 0,
          saleCount: 0,
          updatedAt: nowIso()
        };

    switch (signal) {
      case "view":
        base.viewCount += 1;
        break;
      case "watchlist":
        base.watchlistCount += 1;
        break;
      case "share":
        base.shareCount += 1;
        break;
      case "offer":
        // We don't track offerCount in the table directly; offer activity still
        // contributes to the trending score weight below.
        break;
      case "bid":
        base.bidCount += 1;
        break;
      case "sale":
        base.saleCount += 1;
        break;
    }

    const next =
      Number(base.trendingScore || "0") + SCORE_WEIGHTS[signal];
    base.trendingScore = next.toFixed(4);
    base.updatedAt = nowIso();
    rankingRepo.upsert(base);

    await publishOutbox({
      id: newId(),
      eventType: "ranking.recalculated",
      aggregateId: assetId,
      aggregateType: "asset",
      payload: { assetId, signal, trendingScore: base.trendingScore },
      occurredAt: nowIso()
    });

    return base;
  },

  find(assetId: string) {
    return rankingRepo.find(assetId);
  },

  list() {
    return rankingRepo.list();
  },

  listTop(n: number) {
    return rankingRepo.listTop(n);
  }
};
