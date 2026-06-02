import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const legalMatters = pgTable("legal_matters", {
  id: text("id").primaryKey(),
  externalMatterId: text("external_matter_id").notNull(),
  provider: text("provider").notNull(),
  matterTitle: text("matter_title").notNull(),
  status: text("status").notNull(),
  associatedAgreementIdsJson: jsonb("associated_agreement_ids_json").notNull(),
  associatedDisputeIdsJson: jsonb("associated_dispute_ids_json").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const legalExports = pgTable("legal_exports", {
  id: text("id").primaryKey(),
  matterId: text("matter_id").references(() => legalMatters.id, { onDelete: "set null" }),
  packetId: text("packet_id").notNull(),
  packetType: text("packet_type").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  outputUri: text("output_uri"),
  externalDocumentId: text("external_document_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const legalHolds = pgTable("legal_holds", {
  id: text("id").primaryKey(),
  matterId: text("matter_id").notNull().references(() => legalMatters.id, { onDelete: "cascade" }),
  custodianIdsJson: jsonb("custodian_ids_json").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true })
});
