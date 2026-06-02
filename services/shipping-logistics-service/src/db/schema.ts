import { pgTable, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";

export const shipments = pgTable("shipments", {
  id: text("id").primaryKey(),
  settlementId: text("settlement_id").notNull(),
  assetId: text("asset_id").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  carrier: text("carrier").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  labelUrl: text("label_url").notNull(),
  declaredValue: numeric("declared_value", { precision: 12, scale: 2 }).notNull(),
  weightOz: integer("weight_oz").notNull(),
  deliveryMode: text("delivery_mode").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true })
});

export const shipmentEvents = pgTable("shipment_events", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull()
});
