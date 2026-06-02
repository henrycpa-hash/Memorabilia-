import { pgTable, text, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";

export const slaProfiles = pgTable("sla_profiles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  partnerId: text("partner_id"),
  profileName: text("profile_name").notNull(),
  targetsJson: jsonb("targets_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const slaBreaches = pgTable("sla_breaches", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => slaProfiles.id, { onDelete: "cascade" }),
  targetKey: text("target_key").notNull(),
  observed: numeric("observed", { precision: 14, scale: 4 }).notNull(),
  target: numeric("target", { precision: 14, scale: 4 }).notNull(),
  delta: numeric("delta", { precision: 14, scale: 4 }).notNull(),
  severity: text("severity").notNull(),
  reason: text("reason").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
