import { pgTable, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";

export const insurancePolicies = pgTable("insurance_policies", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id"),
  assetId: text("asset_id").notNull(),
  provider: text("provider").notNull(),
  policyNumber: text("policy_number").notNull(),
  insuredAmount: numeric("insured_amount", { precision: 12, scale: 2 }).notNull(),
  policyState: text("policy_state").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const claims = pgTable("claims", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").notNull(),
  settlementId: text("settlement_id"),
  externalClaimId: text("external_claim_id"),
  claimType: text("claim_type").notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
  evidenceCount: integer("evidence_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const claimEvidence = pgTable("claim_evidence", {
  id: text("id").primaryKey(),
  claimId: text("claim_id").notNull(),
  kind: text("kind").notNull(),
  uri: text("uri").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
