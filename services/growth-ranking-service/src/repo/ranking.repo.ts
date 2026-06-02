export type AssetRanking = {
  assetId: string;
  trendingScore: string;
  watchlistCount: number;
  viewCount: number;
  bidCount: number;
  shareCount: number;
  saleCount: number;
  updatedAt: string;
};

export type ShareCard = {
  id: string;
  assetId: string;
  cardType: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  publicUrl: string;
  createdAt: string;
};

const rankings: AssetRanking[] = [];
const cards: ShareCard[] = [];

export const rankingRepo = {
  upsert(r: AssetRanking) {
    const idx = rankings.findIndex((x) => x.assetId === r.assetId);
    if (idx === -1) rankings.push(r);
    else rankings[idx] = r;
    return r;
  },
  find(assetId: string) {
    return rankings.find((r) => r.assetId === assetId) || null;
  },
  list() {
    return [...rankings];
  },
  listTop(n: number) {
    return [...rankings]
      .sort((a, b) => Number(b.trendingScore) - Number(a.trendingScore))
      .slice(0, n);
  }
};

export const shareCardRepo = {
  insert(c: ShareCard) {
    cards.push(c);
    return c;
  },
  listForAsset(assetId: string) {
    return cards
      .filter((c) => c.assetId === assetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  list() {
    return [...cards];
  }
};
