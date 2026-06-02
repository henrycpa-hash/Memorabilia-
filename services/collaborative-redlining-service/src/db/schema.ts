import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const redlineWorkspaces = pgTable("redline_workspaces", {
  id: text("id").primaryKey(),
  agreementId: text("agreement_id").notNull(),
  currentVersionId: text("current_version_id"),
  status: text("status").notNull(),
  reviewersJson: jsonb("reviewers_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const redlineComments = pgTable("redline_comments", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => redlineWorkspaces.id, { onDelete: "cascade" }),
  clauseKey: text("clause_key"),
  parentCommentId: text("parent_comment_id"),
  actorUserId: text("actor_user_id").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  resolvedByUserId: text("resolved_by_user_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const clausePositions = pgTable("clause_positions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => redlineWorkspaces.id, { onDelete: "cascade" }),
  clauseKey: text("clause_key").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  positionType: text("position_type").notNull(),
  proposedLanguage: text("proposed_language"),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const negotiationCheckpoints = pgTable("negotiation_checkpoints", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => redlineWorkspaces.id, { onDelete: "cascade" }),
  checkpointType: text("checkpoint_type").notNull(),
  status: text("status").notNull(),
  snapshotJson: jsonb("snapshot_json").notNull(),
  decidedByUserId: text("decided_by_user_id"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
