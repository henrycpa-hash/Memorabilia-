import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const labelEntries = pgTable("label_entries", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  featureSnapshotId: text("feature_snapshot_id"),
  labelClass: text("label_class").notNull(),
  labeledByUserId: text("labeled_by_user_id"),
  labelSource: text("label_source").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const datasets = pgTable("datasets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  rowCount: integer("row_count").notNull(),
  labelMixJson: jsonb("label_mix_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const trainingJobs = pgTable("training_jobs", {
  id: text("id").primaryKey(),
  datasetId: text("dataset_id").notNull().references(() => datasets.id, { onDelete: "cascade" }),
  modelName: text("model_name").notNull(),
  candidateVersion: text("candidate_version").notNull(),
  status: text("status").notNull(),
  validationMetricsJson: jsonb("validation_metrics_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const candidateModels = pgTable("candidate_models", {
  id: text("id").primaryKey(),
  trainingJobId: text("training_job_id").notNull().references(() => trainingJobs.id, { onDelete: "cascade" }),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version").notNull(),
  status: text("status").notNull(),
  validationMetricsJson: jsonb("validation_metrics_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
