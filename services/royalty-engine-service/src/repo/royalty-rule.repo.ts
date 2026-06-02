import type { RoyaltyRule } from "@crownx-jewel/contracts";

const store: RoyaltyRule[] = [];

export const royaltyRuleRepo = {
  insert(r: RoyaltyRule) {
    store.push(r);
    return r;
  },
  findByAssetId(assetId: string) {
    return store.find((r) => r.assetId === assetId && r.active) || null;
  },
  list() {
    return [...store];
  }
};
