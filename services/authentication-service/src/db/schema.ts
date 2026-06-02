import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const authenticationCases = pgTable("authentication_cases", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  status: text("status").notNull(),
  aiScore: numeric("ai_score", { precision: 5, scale: 4 }).notNull(),
  reviewerId: text("reviewer_id"),
  decisionReason: text("decision_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});
