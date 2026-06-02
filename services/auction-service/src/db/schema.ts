import { pgTable, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";

export const auctions = pgTable("auctions", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  sellerId: text("seller_id").notNull(),
  reservePrice: numeric("reserve_price", { precision: 14, scale: 2 }).notNull(),
  startingBid: numeric("starting_bid", { precision: 14, scale: 2 }).notNull(),
  minIncrement: numeric("min_increment", { precision: 14, scale: 2 }).notNull(),
  currentBid: numeric("current_bid", { precision: 14, scale: 2 }),
  currentBidderId: text("current_bidder_id"),
  status: text("status").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const bids = pgTable("bids", {
  id: text("id").primaryKey(),
  auctionId: text("auction_id").notNull(),
  bidderId: text("bidder_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  isWinning: boolean("is_winning").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
