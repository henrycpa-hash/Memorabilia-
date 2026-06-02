import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const policyPacks = pgTable("policy_packs", {
  id: text("id").primaryKey(),
  policyType: text("policy_type").notNull(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull(),
  rulesJson: jsonb("rules_json").notNull(),
  tenantId: text("tenant_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const complianceEvaluations = pgTable("compliance_evaluations", {
  id: text("id").primaryKey(),
  policyPackId: text("policy_pack_id").notNull().references(() => policyPacks.id, { onDelete: "cascade" }),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectJson: jsonb("subject_json").notNull(),
  result: text("result").notNull(),
  reasonsJson: jsonb("reasons_json").notNull(),
  matchedRulesJson: jsonb("matched_rules_json").notNull(),
  conditionsJson: jsonb("conditions_json").notNull(),
  tenantId: text("tenant_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
