import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const erpProfiles = pgTable("erp_profiles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  mappingJson: jsonb("mapping_json").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const erpExports = pgTable("erp_exports", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => erpProfiles.id, { onDelete: "cascade" }),
  exportType: text("export_type").notNull(),
  batchKey: text("batch_key").notNull(),
  sourceExportPackageId: text("source_export_package_id"),
  status: text("status").notNull(),
  outputUri: text("output_uri"),
  rowCount: integer("row_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const erpAckEvents = pgTable("erp_ack_events", {
  id: text("id").primaryKey(),
  exportId: text("export_id").notNull().references(() => erpExports.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  acceptedRows: integer("accepted_rows").notNull(),
  rejectedRows: integer("rejected_rows").notNull(),
  exceptionLinesJson: jsonb("exception_lines_json").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
