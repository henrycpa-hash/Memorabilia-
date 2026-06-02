import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull(),
  assetId: text("asset_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }).notNull(),
  royaltyAmount: numeric("royalty_amount", { precision: 14, scale: 2 }).notNull(),
  netToSeller: numeric("net_to_seller", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const checkoutAttempts = pgTable("checkout_attempts", {
  id: text("id").primaryKey(),
  listingId: text("listing_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
