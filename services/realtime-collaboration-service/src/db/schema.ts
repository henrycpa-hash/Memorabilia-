import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const collabSessions = pgTable("collab_sessions", {
  id: text("id").primaryKey(),
  workspaceType: text("workspace_type").notNull(),
  workspaceId: text("workspace_id").notNull(),
  status: text("status").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  sectionLocksJson: jsonb("section_locks_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const collabPresence = pgTable("collab_presence", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => collabSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  state: text("state").notNull(),
  cursorAnchor: text("cursor_anchor"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const collabOperations = pgTable("collab_operations", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => collabSessions.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  kind: text("kind").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  anchor: text("anchor"),
  payloadJson: jsonb("payload_json").notNull(),
  expectedSequence: integer("expected_sequence"),
  accepted: boolean("accepted").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const collabEvents = pgTable("collab_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => collabSessions.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  actorUserId: text("actor_user_id"),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
