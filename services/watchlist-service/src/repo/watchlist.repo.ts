export type WatchlistEntry = {
  id: string;
  userId: string;
  assetId: string;
  createdAt: string;
};

const store: WatchlistEntry[] = [];

export const watchlistRepo = {
  insert(w: WatchlistEntry) {
    // user+asset uniqueness enforced
    const existing = store.find((x) => x.userId === w.userId && x.assetId === w.assetId);
    if (existing) return existing;
    store.push(w);
    return w;
  },
  remove(userId: string, assetId: string) {
    const idx = store.findIndex((x) => x.userId === userId && x.assetId === assetId);
    if (idx === -1) return false;
    store.splice(idx, 1);
    return true;
  },
  listForUser(userId: string) {
    return store.filter((w) => w.userId === userId);
  },
  listForAsset(assetId: string) {
    return store.filter((w) => w.assetId === assetId);
  },
  countForAsset(assetId: string) {
    return store.filter((w) => w.assetId === assetId).length;
  },
  list() {
    return [...store];
  }
};
