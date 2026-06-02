import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const partners = pgTable("partners", {
  id: text("id").primaryKey(),
  partnerType: text("partner_type").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  credentialRef: text("credential_ref"),
  configJson: jsonb("config_json").notNull(),
  tenantId: text("tenant_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const partnerInventoryItems = pgTable("partner_inventory_items", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  externalItemId: text("external_item_id").notNull(),
  externalLotId: text("external_lot_id"),
  mappedAssetId: text("mapped_asset_id"),
  syncState: text("sync_state").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const partnerWebhookEvents = pgTable("partner_webhook_events", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
