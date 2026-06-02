import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const generatedReports = pgTable("generated_reports", {
  id: text("id").primaryKey(),
  reportType: text("report_type").notNull(),
  format: text("format").notNull(),
  scopeJson: jsonb("scope_json"),
  sectionsJson: jsonb("sections_json").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull()
});
