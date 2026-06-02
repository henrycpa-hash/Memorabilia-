import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const legalEscalations = pgTable("legal_escalations", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  matterId: text("matter_id"),
  packetId: text("packet_id"),
  playbookJson: jsonb("playbook_json").notNull(),
  metadataJson: jsonb("metadata_json").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const escalationEvents = pgTable("escalation_events", {
  id: text("id").primaryKey(),
  escalationId: text("escalation_id").notNull().references(() => legalEscalations.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  actorUserId: text("actor_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
