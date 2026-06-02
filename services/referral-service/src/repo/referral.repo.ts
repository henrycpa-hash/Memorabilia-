export type Referral = {
  id: string;
  referrerUserId: string;
  referralCode: string;
  referredUserId: string | null;
  status: "created" | "converted";
  createdAt: string;
  convertedAt: string | null;
};

const store: Referral[] = [];

export const referralRepo = {
  insert(r: Referral) {
    store.push(r);
    return r;
  },
  findByCode(code: string) {
    return store.find((r) => r.referralCode === code) || null;
  },
  listByReferrer(referrerUserId: string) {
    return store.filter((r) => r.referrerUserId === referrerUserId);
  },
  list() {
    return [...store];
  },
  update(id: string, patch: Partial<Referral>) {
    const r = store.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r;
  }
};
