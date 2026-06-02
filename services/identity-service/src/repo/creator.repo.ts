import type { CreatorProfile } from "@crownx-jewel/contracts";

const store: CreatorProfile[] = [];

export const creatorRepo = {
  insert(creator: CreatorProfile) {
    store.push(creator);
    return creator;
  },
  findByHandle(publicHandle: string) {
    return store.find((c) => c.publicHandle === publicHandle) || null;
  },
  list() {
    return [...store];
  }
};
