import { pgTable, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  settlementId: text("settlement_id").notNull(),
  tenantId: text("tenant_id"),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceType: text("invoice_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  partyId: text("party_id").notNull(),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const exportPackages = pgTable("export_packages", {
  id: text("id").primaryKey(),
  exportType: text("export_type").notNull(),
  format: text("format").notNull(),
  scopeJson: jsonb("scope_json").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  csvBody: text("csv_body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
