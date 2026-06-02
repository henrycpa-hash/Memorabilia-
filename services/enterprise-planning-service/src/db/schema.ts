import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const strategicAccounts = pgTable("strategic_accounts", {
  id: text("id").primaryKey(),
  accountName: text("account_name").notNull(),
  ownerUserId: text("owner_user_id"),
  crmAccountRef: text("crm_account_ref"),
  opportunityId: text("opportunity_id"),
  sovereigntyTier: text("sovereignty_tier").notNull(),
  status: text("status").notNull(),
  metadataJson: jsonb("metadata_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const accountPlans = pgTable("account_plans", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => strategicAccounts.id, { onDelete: "cascade" }),
  periodKey: text("period_key").notNull(),
  milestonesJson: jsonb("milestones_json").notNull(),
  blockersJson: jsonb("blockers_json").notNull(),
  dependenciesJson: jsonb("dependencies_json").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  authorUserId: text("author_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const scenarioModels = pgTable("scenario_models", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => strategicAccounts.id, { onDelete: "cascade" }),
  scenarioName: text("scenario_name").notNull(),
  assumptionsJson: jsonb("assumptions_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const forecastRuns = pgTable("forecast_runs", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => strategicAccounts.id, { onDelete: "cascade" }),
  periodKey: text("period_key").notNull(),
  scenarioModelId: text("scenario_model_id"),
  scenariosJson: jsonb("scenarios_json").notNull(),
  primaryConfidence: text("primary_confidence").notNull(),
  crmBaselineCents: integer("crm_baseline_cents"),
  varianceVsCrmCents: integer("variance_vs_crm_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
