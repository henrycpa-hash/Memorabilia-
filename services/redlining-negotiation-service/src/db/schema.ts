import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const contractVersions = pgTable("contract_versions", {
  id: text("id").primaryKey(),
  agreementId: text("agreement_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  contentUri: text("content_uri").notNull(),
  clauseBodiesJson: jsonb("clause_bodies_json").notNull(),
  status: text("status").notNull(),
  authorUserId: text("author_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const redlineDiffs = pgTable("redline_diffs", {
  id: text("id").primaryKey(),
  baseVersionId: text("base_version_id").notNull().references(() => contractVersions.id),
  compareVersionId: text("compare_version_id").notNull().references(() => contractVersions.id),
  status: text("status").notNull(),
  summaryJson: jsonb("summary_json").notNull(),
  diffUri: text("diff_uri").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const negotiationIssues = pgTable("negotiation_issues", {
  id: text("id").primaryKey(),
  agreementId: text("agreement_id").notNull(),
  issueType: text("issue_type").notNull(),
  status: text("status").notNull(),
  clauseKey: text("clause_key"),
  description: text("description").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const clauseLibrary = pgTable("clause_library", {
  id: text("id").primaryKey(),
  clauseKey: text("clause_key").notNull(),
  category: text("category").notNull(),
  languageBody: text("language_body").notNull(),
  fallbackRank: integer("fallback_rank").notNull(),
  requiresLegalReview: text("requires_legal_review").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
