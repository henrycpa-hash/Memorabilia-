import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const watchlists = pgTable(
  "watchlists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    assetId: text("asset_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull()
  },
  (t) => ({
    userAssetUnique: uniqueIndex("watchlists_user_asset_unique").on(t.userId, t.assetId)
  })
);
