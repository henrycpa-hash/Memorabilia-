import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const legalPackets = pgTable("legal_packets", {
  id: text("id").primaryKey(),
  packetType: text("packet_type").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  status: text("status").notNull(),
  manifestJson: jsonb("manifest_json").notNull(),
  outputUri: text("output_uri"),
  preparedByUserId: text("prepared_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const legalPacketItems = pgTable("legal_packet_items", {
  id: text("id").primaryKey(),
  packetId: text("packet_id").notNull().references(() => legalPackets.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  sequence: integer("sequence").notNull(),
  sourceRef: text("source_ref"),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
