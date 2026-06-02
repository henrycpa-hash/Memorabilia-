import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const sovereignAttestationPackets = pgTable("sovereign_attestation_packets", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  packetType: text("packet_type").notNull(),
  periodKey: text("period_key").notNull(),
  status: text("status").notNull(),
  manifestJson: jsonb("manifest_json").notNull(),
  outputUri: text("output_uri"),
  legalPacketId: text("legal_packet_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const sovereignAttestationExports = pgTable("sovereign_attestation_exports", {
  id: text("id").primaryKey(),
  packetId: text("packet_id").notNull().references(() => sovereignAttestationPackets.id, { onDelete: "cascade" }),
  exportTargetType: text("export_target_type").notNull(),
  exportTargetId: text("export_target_id"),
  approvalStatus: text("approval_status").notNull(),
  approverUserId: text("approver_user_id"),
  receiptJson: jsonb("receipt_json"),
  externalVerificationUri: text("external_verification_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});
