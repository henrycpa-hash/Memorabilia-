-- Wave 10 legal escalation
CREATE TABLE IF NOT EXISTS legal_escalations (
  id text PRIMARY KEY,
  source_type text NOT NULL,
  source_id text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL,
  matter_id text,
  packet_id text,
  playbook_json jsonb NOT NULL,
  metadata_json jsonb NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legal_escalations_source ON legal_escalations (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_legal_escalations_status_severity ON legal_escalations (status, severity);

CREATE TABLE IF NOT EXISTS escalation_events (
  id text PRIMARY KEY,
  escalation_id text NOT NULL REFERENCES legal_escalations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL,
  actor_user_id text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_escalation_events_escalation ON escalation_events (escalation_id, created_at);
