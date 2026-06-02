import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const regulatorRouting = pgTable("regulator_routing", {
  id: text("id").primaryKey(),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  sourceType: text("source_type").notNull(),
  regulatorKey: text("regulator_key").notNull(),
  regulatorName: text("regulator_name").notNull(),
  deadlineDays: integer("deadline_days").notNull(),
  responsePackRequired: boolean("response_pack_required").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const regulatorNotices = pgTable("regulator_notices", {
  id: text("id").primaryKey(),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  regulatorKey: text("regulator_key").notNull(),
  regulatorName: text("regulator_name").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  triggerAt: timestamp("trigger_at", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  title: text("title").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  approverUserIdsJson: jsonb("approver_user_ids_json").notNull(),
  responsePackUri: text("response_pack_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const noticeSubmissions = pgTable("notice_submissions", {
  id: text("id").primaryKey(),
  noticeId: text("notice_id").notNull().references(() => regulatorNotices.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  submissionRef: text("submission_ref"),
  outputUri: text("output_uri"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
