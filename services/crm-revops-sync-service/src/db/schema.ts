import { pgTable, text, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";

export const crmSyncAccounts = pgTable("crm_sync_accounts", {
  id: text("id").primaryKey(),
  externalAccountId: text("external_account_id").notNull(),
  internalAccountId: text("internal_account_id"),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const crmSyncOpportunities = pgTable("crm_sync_opportunities", {
  id: text("id").primaryKey(),
  externalOpportunityId: text("external_opportunity_id").notNull(),
  externalAccountId: text("external_account_id").notNull(),
  internalOpportunityId: text("internal_opportunity_id"),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  externalStage: text("external_stage").notNull(),
  platformStage: text("platform_stage").notNull(),
  probabilityBps: integer("probability_bps").notNull(),
  estimatedCloseDate: timestamp("estimated_close_date", { withTimezone: true }),
  amountCents: integer("amount_cents").notNull(),
  ownerUserId: text("owner_user_id"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const forecastReconciliations = pgTable("forecast_reconciliations", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  periodKey: text("period_key").notNull(),
  platformForecastJson: jsonb("platform_forecast_json").notNull(),
  crmForecastJson: jsonb("crm_forecast_json").notNull(),
  varianceCents: integer("variance_cents").notNull(),
  variancePct: real("variance_pct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
