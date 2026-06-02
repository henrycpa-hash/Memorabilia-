-- Wave 10 collaborative redlining
CREATE TABLE IF NOT EXISTS redline_workspaces (
  id text PRIMARY KEY,
  agreement_id text NOT NULL,
  current_version_id text,
  status text NOT NULL,
  reviewers_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redline_workspaces_agreement ON redline_workspaces (agreement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS redline_comments (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES redline_workspaces(id) ON DELETE CASCADE,
  clause_key text,
  parent_comment_id text,
  actor_user_id text NOT NULL,
  body text NOT NULL,
  status text NOT NULL,
  resolved_by_user_id text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redline_comments_workspace ON redline_comments (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_redline_comments_status ON redline_comments (workspace_id, status);

CREATE TABLE IF NOT EXISTS clause_positions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES redline_workspaces(id) ON DELETE CASCADE,
  clause_key text NOT NULL,
  actor_user_id text NOT NULL,
  actor_role text NOT NULL,
  position_type text NOT NULL,
  proposed_language text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clause_positions_workspace_clause ON clause_positions (workspace_id, clause_key);

CREATE TABLE IF NOT EXISTS negotiation_checkpoints (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES redline_workspaces(id) ON DELETE CASCADE,
  checkpoint_type text NOT NULL,
  status text NOT NULL,
  snapshot_json jsonb NOT NULL,
  decided_by_user_id text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_negotiation_checkpoints_workspace ON negotiation_checkpoints (workspace_id, created_at DESC);
