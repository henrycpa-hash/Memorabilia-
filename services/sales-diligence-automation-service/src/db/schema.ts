import { pgTable, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const salesOpportunities = pgTable("sales_opportunities", {
  id: text("id").primaryKey(),
  accountName: text("account_name").notNull(),
  buyerKey: text("buyer_key").notNull(),
  stage: text("stage").notNull(),
  ownerUserId: text("owner_user_id"),
  scopeJson: jsonb("scope_json").notNull(),
  estimatedDealCents: integer("estimated_deal_cents"),
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const diligenceWorkspaces = pgTable("diligence_workspaces", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => salesOpportunities.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  checklistJson: jsonb("checklist_json").notNull(),
  outputUri: text("output_uri"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const diligenceResponseItems = pgTable("diligence_response_items", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => diligenceWorkspaces.id, { onDelete: "cascade" }),
  itemKey: text("item_key").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  body: text("body").notNull(),
  evidenceRef: text("evidence_ref"),
  buyerSpecific: boolean("buyer_specific").notNull(),
  estimatedEffortHours: integer("estimated_effort_hours").notNull(),
  reusedFromWorkspaceIdsJson: jsonb("reused_from_workspace_ids_json").notNull(),
  reviewerUserId: text("reviewer_user_id"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});
