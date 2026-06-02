import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const socialPosts = pgTable("social_posts", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  channel: text("channel").notNull(),
  text: text("text").notNull(),
  mediaUrlsJson: jsonb("media_urls_json").notNull().default([]),
  linkUrl: text("link_url"),
  status: text("status").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  externalPostId: text("external_post_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});
