-- Wave 10 regulator notice orchestration
CREATE TABLE IF NOT EXISTS regulator_routing (
  id text PRIMARY KEY,
  jurisdiction_key text NOT NULL,
  source_type text NOT NULL,
  regulator_key text NOT NULL,
  regulator_name text NOT NULL,
  deadline_days integer NOT NULL,
  response_pack_required boolean NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regulator_routing_lookup ON regulator_routing (jurisdiction_key, source_type);

CREATE TABLE IF NOT EXISTS regulator_notices (
  id text PRIMARY KEY,
  jurisdiction_key text NOT NULL,
  regulator_key text NOT NULL,
  regulator_name text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL,
  trigger_at timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  title text NOT NULL,
  payload_json jsonb NOT NULL,
  approver_user_ids_json jsonb NOT NULL,
  response_pack_uri text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regulator_notices_status_due ON regulator_notices (status, due_date);
CREATE INDEX IF NOT EXISTS idx_regulator_notices_source ON regulator_notices (source_type, source_id);

CREATE TABLE IF NOT EXISTS notice_submissions (
  id text PRIMARY KEY,
  notice_id text NOT NULL REFERENCES regulator_notices(id) ON DELETE CASCADE,
  status text NOT NULL,
  submission_ref text,
  output_uri text,
  acknowledged_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notice_submissions_notice ON notice_submissions (notice_id, created_at DESC);
