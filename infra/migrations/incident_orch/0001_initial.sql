-- Wave 11 sovereignty incident orchestration
CREATE TABLE IF NOT EXISTS sovereignty_incidents (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  sovereignty_class_key text NOT NULL,
  incident_type text NOT NULL,
  title text NOT NULL,
  base_severity text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL,
  classification_json jsonb NOT NULL,
  affected_regions_json jsonb NOT NULL,
  involves_regulated_data boolean NOT NULL,
  linked_legal_escalation_id text,
  linked_regulator_notice_ids_json jsonb NOT NULL,
  linked_residency_review_id text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_sovereignty_incidents_tenant ON sovereignty_incidents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sovereignty_incidents_severity ON sovereignty_incidents (severity, status);

CREATE TABLE IF NOT EXISTS incident_runbook_actions (
  id text PRIMARY KEY,
  incident_id text NOT NULL REFERENCES sovereignty_incidents(id) ON DELETE CASCADE,
  runbook_key text NOT NULL,
  action_type text NOT NULL,
  sequence integer NOT NULL,
  status text NOT NULL,
  payload_json jsonb NOT NULL,
  external_ref text,
  created_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_incident_runbook_actions_incident ON incident_runbook_actions (incident_id, sequence);
CREATE INDEX IF NOT EXISTS idx_incident_runbook_actions_status ON incident_runbook_actions (status);

CREATE TABLE IF NOT EXISTS incident_postmortems (
  id text PRIMARY KEY,
  incident_id text NOT NULL REFERENCES sovereignty_incidents(id) ON DELETE CASCADE,
  summary_json jsonb NOT NULL,
  output_uri text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incident_postmortems_incident ON incident_postmortems (incident_id);
