import type { LedgerEntry, PayoutItem, PayoutBatch } from "@crownx-jewel/shared-ledger";

const entries: LedgerEntry[] = [];
const payouts: PayoutItem[] = [];
const batches: PayoutBatch[] = [];

export const ledgerRepo = {
  insertEntry(e: LedgerEntry) {
    entries.push(e);
    return e;
  },
  insertEntries(es: LedgerEntry[]) {
    entries.push(...es);
    return es;
  },
  listEntries() {
    return [...entries];
  },
  listEntriesByReference(referenceType: string, referenceId: string) {
    return entries.filter(
      (e) => e.referenceType === referenceType && e.referenceId === referenceId
    );
  },
  listEntriesByAccount(accountId: string) {
    return entries.filter((e) => e.accountId === accountId);
  },

  insertPayout(p: PayoutItem) {
    payouts.push(p);
    return p;
  },
  listPayouts() {
    return [...payouts];
  },
  listPayoutsForPayee(payeeId: string) {
    return payouts.filter((p) => p.payeeId === payeeId);
  },
  updatePayoutStatus(id: string, status: PayoutItem["status"]) {
    const p = payouts.find((x) => x.id === id);
    if (p) p.status = status;
    return p || null;
  },

  insertBatch(b: PayoutBatch) {
    batches.push(b);
    return b;
  },
  listBatches() {
    return [...batches];
  }
};
