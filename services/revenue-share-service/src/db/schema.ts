import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const revenueShareTrees = pgTable("revenue_share_trees", {
  id: text("id").primaryKey(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  rulesJson: jsonb("rules_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const revenueShareCalculations = pgTable("revenue_share_calculations", {
  id: text("id").primaryKey(),
  treeId: text("tree_id").notNull().references(() => revenueShareTrees.id, { onDelete: "cascade" }),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  totalCents: integer("total_cents").notNull(),
  outcomesJson: jsonb("outcomes_json").notNull(),
  remainderCents: integer("remainder_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const partnerStatements = pgTable("partner_statements", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  totalCents: integer("total_cents").notNull(),
  lineItemsJson: jsonb("line_items_json").notNull(),
  outputUri: text("output_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
