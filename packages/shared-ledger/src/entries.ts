import type { LedgerAccountId } from "./accounts";

export type Direction = "debit" | "credit";

/**
 * The minimal posting input the ledger accepts. Amounts are passed as strings
 * with two decimal places to keep them safe across JSON / Decimal boundaries.
 */
export type PostingInput = {
  accountId: LedgerAccountId;
  direction: Direction;
  amount: string;
  referenceType: string;
  referenceId: string;
  memo: string;
};

export type LedgerEntry = PostingInput & {
  id: string;
  createdAt: string;
};

export type PayoutItem = {
  id: string;
  payoutBatchId: string | null;
  payeeId: string;
  amount: string;
  referenceType: string;
  referenceId: string;
  status: "pending" | "scheduled" | "paid" | "failed";
  createdAt: string;
};

export type PayoutBatch = {
  id: string;
  status: "open" | "scheduled" | "paid" | "failed";
  createdAt: string;
};
