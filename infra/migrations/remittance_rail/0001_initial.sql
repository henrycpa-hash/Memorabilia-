-- Wave 11 remittance rail connector
CREATE TABLE IF NOT EXISTS remittance_rails (
  id text PRIMARY KEY,
  jurisdiction_key text NOT NULL,
  rail_type text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  config_json jsonb NOT NULL,
  idempotency_window_seconds integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_remittance_rails_jur ON remittance_rails (jurisdiction_key, status);

CREATE TABLE IF NOT EXISTS remittance_submissions (
  id text PRIMARY KEY,
  obligation_id text NOT NULL,
  upstream_remittance_run_id text,
  rail_id text NOT NULL REFERENCES remittance_rails(id),
  jurisdiction_key text NOT NULL,
  external_submission_ref text,
  status text NOT NULL,
  amount_cents integer NOT NULL,
  receipt_uri text,
  failure_reason text,
  idempotency_key text NOT NULL,
  retry_attempts integer NOT NULL,
  created_at timestamptz NOT NULL,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_remittance_submissions_status ON remittance_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remittance_submissions_idemp ON remittance_submissions (rail_id, idempotency_key, created_at);

CREATE TABLE IF NOT EXISTS remittance_receipts (
  id text PRIMARY KEY,
  submission_id text NOT NULL REFERENCES remittance_submissions(id) ON DELETE CASCADE,
  receipt_type text NOT NULL,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_remittance_receipts_sub ON remittance_receipts (submission_id, created_at);
