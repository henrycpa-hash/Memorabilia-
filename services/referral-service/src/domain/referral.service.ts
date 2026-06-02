import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { referralRepo, type Referral } from "../repo/referral.repo";

function generateCode(): string {
  // 8-char base36 code, uppercase.
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export const referralService = {
  async create(referrerUserId: string): Promise<Referral> {
    const referral: Referral = {
      id: newId(),
      referrerUserId,
      referralCode: generateCode(),
      referredUserId: null,
      status: "created",
      createdAt: nowIso(),
      convertedAt: null
    };
    referralRepo.insert(referral);
    return referral;
  },

  async convert(referralCode: string, referredUserId: string): Promise<Referral | null> {
    const r = referralRepo.findByCode(referralCode);
    if (!r) return null;
    return (
      referralRepo.update(r.id, {
        referredUserId,
        status: "converted",
        convertedAt: nowIso()
      }) || null
    );
  },

  listByReferrer(referrerUserId: string) {
    return referralRepo.listByReferrer(referrerUserId);
  },

  list() {
    return referralRepo.list();
  }
};
