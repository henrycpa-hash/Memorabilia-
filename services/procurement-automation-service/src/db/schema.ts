import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const procurementQuestionnaires = pgTable("procurement_questionnaires", {
  id: text("id").primaryKey(),
  templateKey: text("template_key").notNull(),
  title: text("title").notNull(),
  questionsJson: jsonb("questions_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const procurementResponses = pgTable("procurement_responses", {
  id: text("id").primaryKey(),
  questionnaireId: text("questionnaire_id").notNull().references(() => procurementQuestionnaires.id),
  tenantId: text("tenant_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  status: text("status").notNull(),
  answersJson: jsonb("answers_json").notNull(),
  reviewerUserIdsJson: jsonb("reviewer_user_ids_json").notNull(),
  outputUri: text("output_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
});

export const procurementEvidenceMaps = pgTable("procurement_evidence_maps", {
  id: text("id").primaryKey(),
  questionnaireId: text("questionnaire_id").notNull().references(() => procurementQuestionnaires.id, { onDelete: "cascade" }),
  questionKey: text("question_key").notNull(),
  evidenceRef: text("evidence_ref").notNull(),
  evidenceType: text("evidence_type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
