import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const creatorProfiles = pgTable("creator_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  publicHandle: text("public_handle").notNull().unique(),
  creatorType: text("creator_type").notNull(),
  verified: boolean("verified").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
