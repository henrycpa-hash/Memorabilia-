import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const assuranceAudits = pgTable("assurance_audits", {
  id: text("id").primaryKey(),
  auditType: text("audit_type").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  status: text("status").notNull(),
  summaryJson: jsonb("summary_json"),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const assuranceVariances = pgTable("assurance_variances", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().references(() => assuranceAudits.id, { onDelete: "cascade" }),
  varianceType: text("variance_type").notNull(),
  severity: text("severity").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  expectedCents: integer("expected_cents"),
  actualCents: integer("actual_cents"),
  driftCents: integer("drift_cents"),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
