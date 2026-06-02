/**
 * Wave 6 partner integration primitives.
 *
 * Partner adapters expose a stable shape that the partner-integration-service
 * uses to onboard dealers, auction houses, leagues, schools, and downstream
 * marketplaces.
 */
export type PartnerType = "dealer" | "auction_house" | "league" | "school" | "marketplace";

export type PartnerStatus = "draft" | "active" | "suspended" | "archived";

export type SyncState = "pending" | "matched" | "candidate" | "ambiguous" | "rejected";

export interface PartnerInventoryItem {
  externalItemId: string;
  externalLotId?: string;
  title: string;
  category: string;
  price?: number;
  description?: string;
  provenancePayload?: Record<string, unknown>;
}

export interface PartnerAdapter {
  fetchInventory(input: {
    partnerId: string;
    cursor?: string;
  }): Promise<{ items: PartnerInventoryItem[]; nextCursor?: string }>;

  pushSettlementStatus(input: {
    partnerId: string;
    externalItemId: string;
    status: string;
    payload?: Record<string, unknown>;
  }): Promise<{ acknowledged: boolean }>;
}

/** Mock partner adapter: synthesizes a deterministic inventory feed. */
export const mockPartnerAdapter: PartnerAdapter = {
  async fetchInventory(input) {
    const seed = input.cursor ? Number(input.cursor) || 0 : 0;
    const items: PartnerInventoryItem[] = Array.from({ length: 3 }, (_, i) => ({
      externalItemId: `EXT-${input.partnerId}-${seed + i}`,
      externalLotId: `LOT-${seed + i}`,
      title: `Mock partner item #${seed + i + 1}`,
      category: "memorabilia",
      price: 1500 + (seed + i) * 250,
      provenancePayload: { source: "mock_feed", row: seed + i }
    }));
    return { items, nextCursor: String(seed + items.length) };
  },
  async pushSettlementStatus() {
    return { acknowledged: true };
  }
};
