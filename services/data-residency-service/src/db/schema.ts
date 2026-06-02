import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const residencyRegions = pgTable("residency_regions", {
  id: text("id").primaryKey(),
  regionKey: text("region_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  policyJson: jsonb("policy_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const tenantResidencyAssignments = pgTable("tenant_residency_assignments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  regionId: text("region_id").notNull().references(() => residencyRegions.id),
  regionKey: text("region_key").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const residencyEvaluations = pgTable("residency_evaluations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  regionId: text("region_id").notNull().references(() => residencyRegions.id),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  inputJson: jsonb("input_json").notNull(),
  evaluationJson: jsonb("evaluation_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
