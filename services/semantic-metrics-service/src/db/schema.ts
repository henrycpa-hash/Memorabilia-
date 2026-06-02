import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const metricDefinitions = pgTable("metric_definitions", {
  id: text("id").primaryKey(),
  metricKey: text("metric_key").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  source: text("source").notNull(),
  unit: text("unit").notNull(),
  description: text("description").notNull(),
  dimensionsJson: jsonb("dimensions_json").notNull(),
  tenantId: text("tenant_id"),
  governance: text("governance").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
