import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const policySimulations = pgTable("policy_simulations", {
  id: text("id").primaryKey(),
  policyPackId: text("policy_pack_id").notNull(),
  policyType: text("policy_type"),
  subjectFactsJson: jsonb("subject_facts_json").notNull(),
  variantsJson: jsonb("variants_json").notNull(),
  status: text("status").notNull(),
  resultJson: jsonb("result_json"),
  preparedByUserId: text("prepared_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});
