import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  settlementId: text("settlement_id").notNull(),
  openedByUserId: text("opened_by_user_id").notNull(),
  disputeType: text("dispute_type").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  resolutionType: text("resolution_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const disputeMessages = pgTable("dispute_messages", {
  id: text("id").primaryKey(),
  disputeId: text("dispute_id").notNull(),
  actorId: text("actor_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
