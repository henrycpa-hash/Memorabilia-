import { pgTable, text, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";

export const privacyComputeJobs = pgTable("privacy_compute_jobs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(),
  metricSetsJson: jsonb("metric_sets_json").notNull(),
  epsilon: real("epsilon").notNull(),
  policyId: text("policy_id"),
  status: text("status").notNull(),
  resultUri: text("result_uri"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
});

export const privacyReleaseArtifacts = pgTable("privacy_release_artifacts", {
  id: text("id").primaryKey(),
  computeJobId: text("compute_job_id").notNull().references(() => privacyComputeJobs.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(),
  decision: text("decision").notNull(),
  protectedValue: real("protected_value"),
  noiseAddedAbs: integer("noise_added_abs").notNull(),
  outputUri: text("output_uri").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
