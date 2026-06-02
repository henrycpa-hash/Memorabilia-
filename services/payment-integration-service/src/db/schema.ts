import { pgTable, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";

export const paymentIntents = pgTable("payment_intents", {
  id: text("id").primaryKey(),
  settlementId: text("settlement_id").notNull(),
  provider: text("provider").notNull(),
  providerIntentId: text("provider_intent_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  paymentMethodType: text("payment_method_type").notNull(),
  clientSecret: text("client_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(),
  paymentIntentId: text("payment_intent_id").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const payouts = pgTable("payouts_v2", {
  id: text("id").primaryKey(),
  settlementId: text("settlement_id").notNull(),
  payeeId: text("payee_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  provider: text("provider").notNull(),
  providerPayoutId: text("provider_payout_id").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
