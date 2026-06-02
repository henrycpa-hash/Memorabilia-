import { pgTable, text, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";

export const experiments = pgTable("experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetSurface: text("target_surface").notNull(),
  status: text("status").notNull(),
  hypothesis: text("hypothesis").notNull(),
  variantsJson: jsonb("variants_json").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  successMetric: text("success_metric").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const exposures = pgTable("exposures", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  subjectId: text("subject_id").notNull(),
  variantKey: text("variant_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const conversions = pgTable("conversions", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id").notNull(),
  subjectId: text("subject_id").notNull(),
  variantKey: text("variant_key").notNull(),
  metricKey: text("metric_key").notNull(),
  value: numeric("value", { precision: 12, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
