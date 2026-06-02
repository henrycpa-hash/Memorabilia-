import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const signatureEnvelopes = pgTable("signature_envelopes", {
  id: text("id").primaryKey(),
  agreementId: text("agreement_id").notNull(),
  provider: text("provider").notNull(),
  providerEnvelopeId: text("provider_envelope_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  documentRef: text("document_ref"),
  signedArtifactUri: text("signed_artifact_uri"),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const signatureSigners = pgTable("signature_signers", {
  id: text("id").primaryKey(),
  envelopeId: text("envelope_id").notNull().references(() => signatureEnvelopes.id, { onDelete: "cascade" }),
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email").notNull(),
  signerRole: text("signer_role").notNull(),
  signingOrder: integer("signing_order").notNull(),
  status: text("status").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const signatureCallbacks = pgTable("signature_callbacks", {
  id: text("id").primaryKey(),
  envelopeId: text("envelope_id").notNull().references(() => signatureEnvelopes.id, { onDelete: "cascade" }),
  callbackType: text("callback_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
