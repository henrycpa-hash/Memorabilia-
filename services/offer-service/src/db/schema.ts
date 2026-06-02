import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  listingId: text("listing_id"),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  counterAmount: numeric("counter_amount", { precision: 14, scale: 2 }),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const offerEvents = pgTable("offer_events", {
  id: text("id").primaryKey(),
  offerId: text("offer_id").notNull(),
  eventType: text("event_type").notNull(),
  actorId: text("actor_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
