import { pgTable, text, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";

export const fraudScores = pgTable("fraud_scores", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  score: integer("score").notNull(),
  riskBand: text("risk_band").notNull(),
  reasons: jsonb("reasons").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const fraudAlerts = pgTable("fraud_alerts", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const userReputations = pgTable("user_reputations", {
  userId: text("user_id").primaryKey(),
  score: numeric("score", { precision: 10, scale: 2 }).notNull(),
  tier: text("tier").notNull(),
  successfulTrades: integer("successful_trades").notNull(),
  disputeRate: numeric("dispute_rate", { precision: 5, scale: 4 }).notNull(),
  fraudFlags: integer("fraud_flags").notNull(),
  watchFollowers: integer("watch_followers").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const creatorReputations = pgTable("creator_reputations", {
  creatorId: text("creator_id").primaryKey(),
  momentum: numeric("momentum", { precision: 12, scale: 2 }).notNull(),
  authenticatedAssetCount: integer("authenticated_asset_count").notNull(),
  resaleVelocity: numeric("resale_velocity", { precision: 8, scale: 2 }).notNull(),
  campaignConversionRate: numeric("campaign_conversion_rate", { precision: 5, scale: 4 }).notNull(),
  referralConversionRate: numeric("referral_conversion_rate", { precision: 5, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});
