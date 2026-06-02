import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { watchlistRepo, type WatchlistEntry } from "../repo/watchlist.repo";

export const watchlistService = {
  async add(userId: string, assetId: string): Promise<WatchlistEntry> {
    const entry: WatchlistEntry = {
      id: newId(),
      userId,
      assetId,
      createdAt: nowIso()
    };
    const inserted = watchlistRepo.insert(entry);
    if (inserted === entry) {
      await publishOutbox({
        id: newId(),
        eventType: "watchlist.added",
        aggregateId: entry.assetId,
        aggregateType: "asset",
        payload: { userId, assetId },
        occurredAt: nowIso()
      });
    }
    return inserted;
  },

  async remove(userId: string, assetId: string): Promise<boolean> {
    const removed = watchlistRepo.remove(userId, assetId);
    if (removed) {
      await publishOutbox({
        id: newId(),
        eventType: "watchlist.removed",
        aggregateId: assetId,
        aggregateType: "asset",
        payload: { userId, assetId },
        occurredAt: nowIso()
      });
    }
    return removed;
  },

  listForUser(userId: string) {
    return watchlistRepo.listForUser(userId);
  },

  listForAsset(assetId: string) {
    return watchlistRepo.listForAsset(assetId);
  },

  countForAsset(assetId: string) {
    return watchlistRepo.countForAsset(assetId);
  }
};
