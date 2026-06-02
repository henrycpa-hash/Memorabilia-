import { pgTable, text, timestamp, jsonb, numeric, integer } from "drizzle-orm/pg-core";

export const billingPlans = pgTable("billing_plans", {
  id: text("id").primaryKey(),
  planKey: text("plan_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  pricingModel: text("pricing_model").notNull(),
  baseFeeCents: integer("base_fee_cents").notNull(),
  entitlementsJson: jsonb("entitlements_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  planId: text("plan_id").notNull().references(() => billingPlans.id),
  status: text("status").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const usageEvents = pgTable("usage_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  usageType: text("usage_type").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  referenceId: text("reference_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const billingStatements = pgTable("billing_statements", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  subscriptionId: text("subscription_id").notNull().references(() => tenantSubscriptions.id),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  baseFeeCents: integer("base_fee_cents").notNull(),
  overageCents: integer("overage_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  perUsageCentsJson: jsonb("per_usage_cents_json").notNull(),
  usageTotalsJson: jsonb("usage_totals_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
