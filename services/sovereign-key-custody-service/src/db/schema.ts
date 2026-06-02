import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const custodyProfiles = pgTable("custody_profiles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  custodyMode: text("custody_mode").notNull(),
  regionKey: text("region_key").notNull(),
  policyJson: jsonb("policy_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const signingKeys = pgTable("signing_keys", {
  id: text("id").primaryKey(),
  custodyProfileId: text("custody_profile_id").notNull().references(() => custodyProfiles.id, { onDelete: "cascade" }),
  keyAlias: text("key_alias").notNull(),
  regionKey: text("region_key").notNull(),
  keyType: text("key_type").notNull(),
  status: text("status").notNull(),
  rotatedFromKeyId: text("rotated_from_key_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const signingEvents = pgTable("signing_events", {
  id: text("id").primaryKey(),
  keyId: text("key_id").notNull().references(() => signingKeys.id),
  custodyProfileId: text("custody_profile_id").notNull().references(() => custodyProfiles.id),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  callerRegion: text("caller_region").notNull(),
  callerRole: text("caller_role").notNull(),
  isBreakGlass: boolean("is_break_glass").notNull(),
  evaluationJson: jsonb("evaluation_json").notNull(),
  attestationReceiptId: text("attestation_receipt_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const custodyAttestations = pgTable("custody_attestations", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id").notNull(),
  keyId: text("key_id").notNull().references(() => signingKeys.id),
  custodyProfileId: text("custody_profile_id").notNull().references(() => custodyProfiles.id),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  signingEventId: text("signing_event_id").notNull().references(() => signingEvents.id),
  attestedAt: timestamp("attested_at", { withTimezone: true }).notNull(),
  controlState: text("control_state").notNull(),
  contextDigest: text("context_digest").notNull(),
  notes: text("notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
