import { pgTable, text, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";

export const forecastDrivers = pgTable("forecast_drivers", {
  id: text("id").primaryKey(),
  driverKey: text("driver_key").notNull().unique(),
  category: text("category").notNull(),
  displayName: text("display_name").notNull(),
  defaultValue: real("default_value").notNull(),
  unit: text("unit").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const forecastModelRuns = pgTable("forecast_model_runs", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  periodKey: text("period_key").notNull(),
  scenarioType: text("scenario_type").notNull(),
  assumptionsJson: jsonb("assumptions_json").notNull(),
  driverInputsJson: jsonb("driver_inputs_json").notNull(),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const forecastSensitivities = pgTable("forecast_sensitivities", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => forecastModelRuns.id, { onDelete: "cascade" }),
  driverKey: text("driver_key").notNull(),
  deltaType: text("delta_type").notNull(),
  deltaValue: real("delta_value").notNull(),
  scenarioType: text("scenario_type").notNull(),
  resultJson: jsonb("result_json").notNull(),
  varianceCents: integer("variance_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
