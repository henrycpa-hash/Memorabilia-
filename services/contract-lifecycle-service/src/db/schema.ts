import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const agreements = pgTable("agreements", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  agreementType: text("agreement_type").notNull(),
  counterpartyType: text("counterparty_type").notNull(),
  counterpartyName: text("counterparty_name").notNull(),
  counterpartyId: text("counterparty_id"),
  status: text("status").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  termsJson: jsonb("terms_json").notNull(),
  signatureState: text("signature_state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const agreementAmendments = pgTable("agreement_amendments", {
  id: text("id").primaryKey(),
  agreementId: text("agreement_id").notNull().references(() => agreements.id, { onDelete: "cascade" }),
  amendmentNumber: integer("amendment_number").notNull(),
  status: text("status").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
  changesJson: jsonb("changes_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const contractObligations = pgTable("contract_obligations", {
  id: text("id").primaryKey(),
  agreementId: text("agreement_id").notNull().references(() => agreements.id, { onDelete: "cascade" }),
  obligationType: text("obligation_type").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  ownerRole: text("owner_role").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  satisfiedAt: timestamp("satisfied_at", { withTimezone: true })
});
