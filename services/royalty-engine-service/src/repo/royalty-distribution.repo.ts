import type { RoyaltyDistribution } from "@crownx-jewel/contracts";

const store: RoyaltyDistribution[] = [];

export const royaltyDistributionRepo = {
  insert(d: RoyaltyDistribution) {
    store.push(d);
    return d;
  },
  list() {
    return [...store];
  },
  listByOrder(orderId: string) {
    return store.filter((d) => d.orderId === orderId);
  }
};
