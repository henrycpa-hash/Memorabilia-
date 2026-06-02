import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const regulatorPortals = pgTable("regulator_portals", {
  id: text("id").primaryKey(),
  jurisdictionKey: text("jurisdiction_key").notNull(),
  regulatorKey: text("regulator_key").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  configJson: jsonb("config_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const regulatorPortalRefs = pgTable("regulator_portal_refs", {
  id: text("id").primaryKey(),
  noticeId: text("notice_id").notNull(),
  portalId: text("portal_id").notNull().references(() => regulatorPortals.id),
  externalRef: text("external_ref").notNull(),
  status: text("status").notNull(),
  originalDueDate: timestamp("original_due_date", { withTimezone: true }).notNull(),
  effectiveDueDate: timestamp("effective_due_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const regulatorInboundResponses = pgTable("regulator_inbound_responses", {
  id: text("id").primaryKey(),
  portalRefId: text("portal_ref_id").notNull().references(() => regulatorPortalRefs.id, { onDelete: "cascade" }),
  responseType: text("response_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  newDueDate: timestamp("new_due_date", { withTimezone: true }),
  responsePackRequired: text("response_pack_required").notNull(),
  responsePackUri: text("response_pack_uri"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
