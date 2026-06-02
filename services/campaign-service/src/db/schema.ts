import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  campaignType: text("campaign_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  audienceType: text("audience_type").notNull(),
  rewardType: text("reward_type"),
  assetId: text("asset_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const campaignEvents = pgTable("campaign_events", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
