import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const sovereigntyIncidents = pgTable("sovereignty_incidents", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  sovereigntyClassKey: text("sovereignty_class_key").notNull(),
  incidentType: text("incident_type").notNull(),
  title: text("title").notNull(),
  baseSeverity: text("base_severity").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  classificationJson: jsonb("classification_json").notNull(),
  affectedRegionsJson: jsonb("affected_regions_json").notNull(),
  involvesRegulatedData: boolean("involves_regulated_data").notNull(),
  linkedLegalEscalationId: text("linked_legal_escalation_id"),
  linkedRegulatorNoticeIdsJson: jsonb("linked_regulator_notice_ids_json").notNull(),
  linkedResidencyReviewId: text("linked_residency_review_id"),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true })
});

export const incidentRunbookActions = pgTable("incident_runbook_actions", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => sovereigntyIncidents.id, { onDelete: "cascade" }),
  runbookKey: text("runbook_key").notNull(),
  actionType: text("action_type").notNull(),
  sequence: integer("sequence").notNull(),
  status: text("status").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  externalRef: text("external_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const incidentPostmortems = pgTable("incident_postmortems", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => sovereigntyIncidents.id, { onDelete: "cascade" }),
  summaryJson: jsonb("summary_json").notNull(),
  outputUri: text("output_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
