import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const factMarketEvents = pgTable("fact_market_events", {
  id: text("id").primaryKey(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  assetId: text("asset_id").notNull(),
  creatorId: text("creator_id"),
  eventType: text("event_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  userId: text("user_id"),
  sourceId: text("source_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
