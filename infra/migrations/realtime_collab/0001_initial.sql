-- Wave 11 realtime collaboration
CREATE TABLE IF NOT EXISTS collab_sessions (
  id text PRIMARY KEY,
  workspace_type text NOT NULL,
  workspace_id text NOT NULL,
  status text NOT NULL,
  sequence_number integer NOT NULL,
  section_locks_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_workspace ON collab_sessions (workspace_type, workspace_id, status);

CREATE TABLE IF NOT EXISTS collab_presence (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES collab_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  state text NOT NULL,
  cursor_anchor text,
  last_seen_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collab_presence_session ON collab_presence (session_id, user_id);

CREATE TABLE IF NOT EXISTS collab_operations (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES collab_sessions(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  kind text NOT NULL,
  actor_user_id text NOT NULL,
  anchor text,
  payload_json jsonb NOT NULL,
  expected_sequence integer,
  accepted boolean NOT NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collab_operations_session_seq ON collab_operations (session_id, sequence);

CREATE TABLE IF NOT EXISTS collab_events (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES collab_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collab_events_session ON collab_events (session_id, created_at);
