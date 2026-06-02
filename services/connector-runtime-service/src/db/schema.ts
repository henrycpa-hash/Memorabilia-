import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const connectors = pgTable("connectors", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  providerKey: text("provider_key").notNull(),
  displayName: text("display_name").notNull(),
  tenantId: text("tenant_id"),
  credentialRef: text("credential_ref"),
  status: text("status").notNull(),
  retryPolicyJson: jsonb("retry_policy_json").notNull(),
  configJson: jsonb("config_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const connectorCallLogs = pgTable("connector_call_logs", {
  id: text("id").primaryKey(),
  connectorId: text("connector_id").notNull().references(() => connectors.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  attempt: integer("attempt").notNull(),
  outcome: text("outcome").notNull(),
  durationMs: integer("duration_ms").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
