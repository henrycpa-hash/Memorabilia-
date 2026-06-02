import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import type { LedgerEntry, PayoutItem, PostingInput } from "@crownx-jewel/shared-ledger";
import { ledgerRepo } from "../repo/ledger.repo";

export const ledgerService = {
  async postEntries(inputs: PostingInput[]): Promise<LedgerEntry[]> {
    const rows: LedgerEntry[] = inputs.map((p) => ({
      id: newId(),
      ...p,
      createdAt: nowIso()
    }));
    ledgerRepo.insertEntries(rows);

    for (const e of rows) {
      await publishOutbox({
        id: newId(),
        eventType: "ledger.entry.posted",
        aggregateId: e.id,
        aggregateType: "ledger_entry",
        payload: { entryId: e.id, accountId: e.accountId, amount: e.amount },
        occurredAt: nowIso()
      });
    }
    return rows;
  },

  listEntries() {
    return ledgerRepo.listEntries();
  },

  listEntriesByReference(referenceType: string, referenceId: string) {
    return ledgerRepo.listEntriesByReference(referenceType, referenceId);
  },

  listEntriesByAccount(accountId: string) {
    return ledgerRepo.listEntriesByAccount(accountId);
  },

  async createPayoutItem(input: {
    payeeId: string;
    amount: string;
    referenceType: string;
    referenceId: string;
  }): Promise<PayoutItem> {
    const item: PayoutItem = {
      id: newId(),
      payoutBatchId: null,
      payeeId: input.payeeId,
      amount: input.amount,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      status: "pending",
      createdAt: nowIso()
    };
    ledgerRepo.insertPayout(item);

    await publishOutbox({
      id: newId(),
      eventType: "payout.item.created",
      aggregateId: item.id,
      aggregateType: "payout_item",
      payload: { payoutItemId: item.id, payeeId: item.payeeId, amount: item.amount },
      occurredAt: nowIso()
    });

    return item;
  },

  listPayouts() {
    return ledgerRepo.listPayouts();
  },

  listPayoutsForPayee(payeeId: string) {
    return ledgerRepo.listPayoutsForPayee(payeeId);
  }
};
