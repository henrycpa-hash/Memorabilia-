import { pgTable, text, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";

export const identityProviders = pgTable("identity_providers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  providerType: text("provider_type").notNull(),
  issuer: text("issuer").notNull(),
  metadataJson: jsonb("metadata_json").notNull(),
  status: text("status").notNull(),
  domainsJson: jsonb("domains_json").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const ssoRoleMappings = pgTable("sso_role_mappings", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => identityProviders.id, { onDelete: "cascade" }),
  externalGroup: text("external_group").notNull(),
  internalRole: text("internal_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const scimSyncRuns = pgTable("scim_sync_runs", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull().references(() => identityProviders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  totalUsers: integer("total_users").notNull(),
  createdUsers: integer("created_users").notNull(),
  updatedUsers: integer("updated_users").notNull(),
  deactivatedUsers: integer("deactivated_users").notNull(),
  errorsJson: jsonb("errors_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const provisionedUsers = pgTable("provisioned_users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  providerId: text("provider_id").notNull().references(() => identityProviders.id, { onDelete: "cascade" }),
  externalUserId: text("external_user_id").notNull(),
  email: text("email").notNull(),
  givenName: text("given_name"),
  familyName: text("family_name"),
  active: boolean("active").notNull(),
  internalRolesJson: jsonb("internal_roles_json").notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});
