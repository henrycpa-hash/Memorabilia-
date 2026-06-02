import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const remittanceRails = pgTable("remittance_rails", {
  id: text("id").primaryKey(),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  railType: text("rail_type").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  configJson: jsonb("config_json").notNull(),
  idempotencyWindowSeconds: integer("idempotency_window_seconds").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const remittanceSubmissions = pgTable("remittance_submissions", {
  id: text("id").primaryKey(),
  obligationId: text("obligation_id").notNull(),
  upstreamRemittanceRunId: text("upstream_remittance_run_id"),
  railId: text("rail_id").notNull().references(() => remittanceRails.id),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  externalSubmissionRef: text("external_submission_ref"),
  status: text("status").notNull(),
  amountCents: integer("amount_cents").notNull(),
  receiptUri: text("receipt_uri"),
  failureReason: text("failure_reason"),
  idempotencyKey: text("idempotency_key").notNull(),
  retryAttempts: integer("retry_attempts").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const remittanceReceipts = pgTable("remittance_receipts", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => remittanceSubmissions.id, { onDelete: "cascade" }),
  receiptType: text("receipt_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
