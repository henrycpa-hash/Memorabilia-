import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const sovereignClasses = pgTable("sovereign_classes", {
  id: text("id").primaryKey(),
  classKey: text("class_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  tier: text("tier").notNull(),
  policyJson: jsonb("policy_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const tenantSovereignAssignments = pgTable("tenant_sovereign_assignments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  sovereignClassId: text("sovereign_class_id").notNull().references(() => sovereignClasses.id),
  classKey: text("class_key").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const sovereignExportControls = pgTable("sovereign_export_controls", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  controlType: text("control_type").notNull(),
  rulesJson: jsonb("rules_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const sovereignExportEvaluations = pgTable("sovereign_export_evaluations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  controlType: text("control_type").notNull(),
  destinationRegion: text("destination_region").notNull(),
  evaluationJson: jsonb("evaluation_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const sovereignPromotionRequests = pgTable("sovereign_promotion_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  fromEnvironment: text("from_environment").notNull(),
  toEnvironment: text("to_environment").notNull(),
  status: text("status").notNull(),
  approverUserId: text("approver_user_id"),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
