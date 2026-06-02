import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const receivables = pgTable("receivables", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  statementId: text("statement_id").notNull(),
  amountDueCents: integer("amount_due_cents").notNull(),
  amountPaidCents: integer("amount_paid_cents").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  agingBucket: text("aging_bucket").notNull(),
  daysPastDue: integer("days_past_due").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const dunningRuns = pgTable("dunning_runs", {
  id: text("id").primaryKey(),
  receivableId: text("receivable_id").notNull().references(() => receivables.id, { onDelete: "cascade" }),
  cadenceStep: integer("cadence_step").notNull(),
  templateKey: text("template_key").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const promiseToPay = pgTable("promise_to_pay", {
  id: text("id").primaryKey(),
  receivableId: text("receivable_id").notNull().references(() => receivables.id, { onDelete: "cascade" }),
  promisedAmountCents: integer("promised_amount_cents").notNull(),
  promisedDate: timestamp("promised_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const writeoffRequests = pgTable("writeoff_requests", {
  id: text("id").primaryKey(),
  receivableId: text("receivable_id").notNull().references(() => receivables.id, { onDelete: "cascade" }),
  requestedByUserId: text("requested_by_user_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  approverUserId: text("approver_user_id"),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
