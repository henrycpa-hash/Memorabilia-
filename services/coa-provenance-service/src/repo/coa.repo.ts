import type { COARecord } from "@crownx-jewel/contracts";

const store: COARecord[] = [];

export const coaRepo = {
  insert(c: COARecord) {
    store.push(c);
    return c;
  },
  findByAssetId(assetId: string) {
    return store.find((c) => c.assetId === assetId) || null;
  },
  list() {
    return [...store];
  }
};
