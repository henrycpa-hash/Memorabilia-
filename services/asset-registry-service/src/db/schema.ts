import { pgTable, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  originatorId: text("originator_id").notNull(),
  currentOwnerId: text("current_owner_id"),
  assetType: text("asset_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  authenticityStatus: text("authenticity_status").notNull(),
  editionType: text("edition_type"),
  editionNumber: integer("edition_number"),
  totalEditionSize: integer("total_edition_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const evidenceObjects = pgTable("evidence_objects", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  objectType: text("object_type").notNull(),
  storageUri: text("storage_uri").notNull(),
  fileHash: text("file_hash").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  sellerId: text("seller_id").notNull(),
  listingType: text("listing_type").notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const ownershipRecords = pgTable("ownership_records", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  ownerId: text("owner_id").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
  acquisitionMethod: text("acquisition_method").notNull()
});
