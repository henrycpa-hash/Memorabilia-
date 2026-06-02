import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const coaRecords = pgTable("coa_records", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  coaNumber: text("coa_number").notNull().unique(),
  manifestHash: text("manifest_hash").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const provenanceSnapshots = pgTable("provenance_snapshots", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});
