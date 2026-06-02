import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const filingProfiles = pgTable("filing_profiles", {
  id: text("id").primaryKey(),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  filingType: text("filing_type").notNull(),
  displayName: text("display_name").notNull(),
  rulesJson: jsonb("rules_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const filingRuns = pgTable("filing_runs", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => filingProfiles.id),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  filingType: text("filing_type").notNull(),
  periodKey: text("period_key").notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  dataJson: jsonb("data_json").notNull(),
  completenessJson: jsonb("completeness_json"),
  bundleJson: jsonb("bundle_json"),
  filedAt: timestamp("filed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
