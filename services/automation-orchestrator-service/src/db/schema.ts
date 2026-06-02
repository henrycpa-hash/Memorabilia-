import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const automationRules = pgTable("automation_rules", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  audienceType: text("audience_type").notNull(),
  templateKey: text("template_key").notNull(),
  channels: jsonb("channels").notNull(),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true)
});

export const automationExecutions = pgTable("automation_executions", {
  id: text("id").primaryKey(),
  ruleId: text("rule_id").notNull(),
  eventType: text("event_type").notNull(),
  channels: jsonb("channels").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  status: text("status").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
