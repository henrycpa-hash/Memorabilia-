import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const taxJurisdictions = pgTable("tax_jurisdictions", {
  id: text("id").primaryKey(),
  countryCode: text("country_code").notNull(),
  regionCode: text("region_code"),
  displayName: text("display_name").notNull(),
  rulesJson: jsonb("rules_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const taxDeterminations = pgTable("tax_determinations", {
  id: text("id").primaryKey(),
  jurisdictionId: text("jurisdiction_id").notNull().references(() => taxJurisdictions.id),
  jurisdictionDisplay: text("jurisdiction_display").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  netAmountCents: integer("net_amount_cents").notNull(),
  resultJson: jsonb("result_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const taxProfiles = pgTable("tax_profiles", {
  id: text("id").primaryKey(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id").notNull(),
  defaultJurisdictionId: text("default_jurisdiction_id").references(() => taxJurisdictions.id),
  withholdingRateBps: integer("withholding_rate_bps").notNull(),
  vatNumber: text("vat_number"),
  exemptionCertificate: text("exemption_certificate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
