import { pgTable, text, timestamp, jsonb, numeric, boolean } from "drizzle-orm/pg-core";

export const featureSnapshots = pgTable("feature_snapshots", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  featureVectorJson: jsonb("feature_vector_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const modelRegistry = pgTable("model_registry", {
  id: text("id").primaryKey(),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version").notNull(),
  modelType: text("model_type").notNull(),
  status: text("status").notNull(),
  thresholdConfigJson: jsonb("threshold_config_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const inferenceLogs = pgTable("inference_logs", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  modelName: text("model_name").notNull(),
  modelVersion: text("model_version").notNull(),
  championScore: numeric("champion_score", { precision: 5, scale: 4 }).notNull(),
  championDecision: text("champion_decision").notNull(),
  challengerScore: numeric("challenger_score", { precision: 5, scale: 4 }),
  challengerDecision: text("challenger_decision"),
  divergence: boolean("divergence").notNull(),
  explanationJson: jsonb("explanation_json").notNull(),
  realizedOutcome: text("realized_outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
