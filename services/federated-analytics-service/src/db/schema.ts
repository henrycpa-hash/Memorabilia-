import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const peerGroups = pgTable("peer_groups", {
  id: text("id").primaryKey(),
  peerGroupKey: text("peer_group_key").notNull(),
  scopeType: text("scope_type").notNull(),
  description: text("description").notNull(),
  rulesJson: jsonb("rules_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const benchmarkRuns = pgTable("benchmark_runs", {
  id: text("id").primaryKey(),
  peerGroupId: text("peer_group_id").notNull().references(() => peerGroups.id, { onDelete: "cascade" }),
  requestedByTenantId: text("requested_by_tenant_id"),
  metricKeysJson: jsonb("metric_keys_json").notNull(),
  resultsJson: jsonb("results_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
