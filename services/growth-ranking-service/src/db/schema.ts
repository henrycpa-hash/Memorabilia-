import { pgTable, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const assetRankings = pgTable("asset_rankings", {
  assetId: text("asset_id").primaryKey(),
  trendingScore: numeric("trending_score", { precision: 14, scale: 4 }).notNull(),
  watchlistCount: integer("watchlist_count").notNull(),
  viewCount: integer("view_count").notNull(),
  bidCount: integer("bid_count").notNull(),
  shareCount: integer("share_count").notNull(),
  saleCount: integer("sale_count").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const shareCards = pgTable("share_cards", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  cardType: text("card_type").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  imageUrl: text("image_url"),
  publicUrl: text("public_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
