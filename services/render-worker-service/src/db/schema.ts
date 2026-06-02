import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const renderJobs = pgTable("render_jobs", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  templateKey: text("template_key").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  status: text("status").notNull(),
  outputUrl: text("output_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});
