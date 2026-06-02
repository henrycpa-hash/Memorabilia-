import { pgTable, text, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";

export const settlements = pgTable("settlements", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  assetId: text("asset_id").notNull(),
  buyerId: text("buyer_id").notNull(),
  sellerId: text("seller_id").notNull(),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  platformFeeAmount: numeric("platform_fee_amount", { precision: 12, scale: 2 }).notNull(),
  royaltyAmount: numeric("royalty_amount", { precision: 12, scale: 2 }).notNull(),
  sellerNetAmount: numeric("seller_net_amount", { precision: 12, scale: 2 }).notNull(),
  escrowState: text("escrow_state").notNull(),
  settlementState: text("settlement_state").notNull(),
  holdReason: text("hold_reason"),
  riskScore: integer("risk_score"),
  riskBand: text("risk_band"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const settlementEvents = pgTable("settlement_events", {
  id: text("id").primaryKey(),
  settlementId: text("settlement_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
