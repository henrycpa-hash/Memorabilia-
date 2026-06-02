import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const privacyPolicies = pgTable("privacy_policies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  rulesJson: jsonb("rules_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const privacyReleaseChecks = pgTable("privacy_release_checks", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").notNull().references(() => privacyPolicies.id),
  subjectJson: jsonb("subject_json").notNull(),
  decision: text("decision").notNull(),
  reasonsJson: jsonb("reasons_json").notNull(),
  suppressionReasonsJson: jsonb("suppression_reasons_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
