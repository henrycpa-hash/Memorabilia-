import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const taxObligations = pgTable("tax_obligations", {
  id: text("id").primaryKey(),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  jurisdictionId: text("jurisdiction_id"),
  obligationType: text("obligation_type").notNull(),
  periodKey: text("period_key").notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  amountDueCents: integer("amount_due_cents").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  linkedFilingRunId: text("linked_filing_run_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const remittanceRuns = pgTable("remittance_runs", {
  id: text("id").primaryKey(),
  obligationId: text("obligation_id").notNull().references(() => taxObligations.id, { onDelete: "cascade" }),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  status: text("status").notNull(),
  amountCents: integer("amount_cents").notNull(),
  rail: text("rail").notNull(),
  submissionRef: text("submission_ref"),
  paymentEvidenceUri: text("payment_evidence_uri"),
  outputUri: text("output_uri"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const remittanceExceptions = pgTable("remittance_exceptions", {
  id: text("id").primaryKey(),
  remittanceRunId: text("remittance_run_id").notNull().references(() => remittanceRuns.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  nextAction: text("next_action").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
