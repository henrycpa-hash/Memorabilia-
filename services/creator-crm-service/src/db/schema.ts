import { pgTable, text, timestamp, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";

export const segments = pgTable("crm_segments", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  definitionJson: jsonb("definition_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const fanProfiles = pgTable("crm_fan_profiles", {
  userId: text("user_id").primaryKey(),
  role: text("role").notNull(),
  ownedAssets: integer("owned_assets").notNull().default(0),
  watchlistCount: integer("watchlist_count").notNull().default(0),
  totalSpend: numeric("total_spend", { precision: 14, scale: 2 }).notNull().default("0"),
  lastActivityDaysAgo: integer("last_activity_days_ago").notNull().default(0),
  lastPurchaseDaysAgo: integer("last_purchase_days_ago"),
  creatorAffinityIdsJson: jsonb("creator_affinity_ids_json").notNull().default([]),
  collectorTier: text("collector_tier").notNull().default("casual"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const segmentMaterializations = pgTable("crm_segment_materializations", {
  id: text("id").primaryKey(),
  segmentId: text("segment_id").notNull(),
  userIdsJson: jsonb("user_ids_json").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const lifecycleJourneys = pgTable("crm_lifecycle_journeys", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull(),
  name: text("name").notNull(),
  segmentId: text("segment_id").notNull(),
  triggerEventType: text("trigger_event_type").notNull(),
  templateKey: text("template_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
