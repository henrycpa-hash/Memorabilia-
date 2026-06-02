import { pgTable, text, timestamp, numeric, boolean, jsonb } from "drizzle-orm/pg-core";

export const royaltyRules = pgTable("royalty_rules", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  beneficiaries: jsonb("beneficiaries").notNull(),
  active: boolean("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const royaltyDistributions = pgTable("royalty_distributions", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  beneficiaryId: text("beneficiary_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
