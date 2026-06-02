import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const ledgerEntries = pgTable("ledger_entries", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  direction: text("direction").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  memo: text("memo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const payoutItems = pgTable("payout_items", {
  id: text("id").primaryKey(),
  payoutBatchId: text("payout_batch_id"),
  payeeId: text("payee_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const payoutBatches = pgTable("payout_batches", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
