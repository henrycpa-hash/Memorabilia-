import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const referrals = pgTable("referrals", {
  id: text("id").primaryKey(),
  referrerUserId: text("referrer_user_id").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referredUserId: text("referred_user_id"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  convertedAt: timestamp("converted_at", { withTimezone: true })
});
