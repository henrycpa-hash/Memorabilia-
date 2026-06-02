import type {
  Asset as ContractAsset,
  Listing
} from "@crownx-jewel/contracts";

/**
 * Wave 2 stored shape adds slug + visibility to the Wave 1 Asset contract.
 * (We extend rather than mutate the contract package so the public type
 *  stays minimal and other services aren't forced to know about visibility.)
 */
export type StoredAsset = ContractAsset & {
  slug: string;
  visibility: "private" | "public";
};

const assets: StoredAsset[] = [];
const listings: Listing[] = [];

export const assetRepo = {
  insert(a: StoredAsset) {
    assets.push(a);
    return a;
  },
  list() {
    return [...assets];
  },
  listPublic() {
    return assets.filter((a) => a.visibility === "public");
  },
  getById(id: string) {
    return assets.find((a) => a.id === id);
  },
  findBySlug(slug: string) {
    return assets.find((a) => a.slug === slug);
  },
  listByOwner(ownerId: string) {
    return assets.filter((a) => a.currentOwnerId === ownerId);
  },
  update(id: string, patch: Partial<StoredAsset>) {
    const a = assets.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
    return a;
  }
};

export const listingRepo = {
  insert(l: Listing) {
    listings.push(l);
    return l;
  },
  list() {
    return [...listings];
  },
  getById(id: string) {
    return listings.find((l) => l.id === id);
  },
  update(id: string, patch: Partial<Listing>) {
    const l = listings.find((x) => x.id === id);
    if (l) Object.assign(l, patch);
    return l;
  }
};
