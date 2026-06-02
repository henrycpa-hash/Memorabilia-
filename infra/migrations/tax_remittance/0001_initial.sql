-- Wave 10 tax remittance
CREATE TABLE IF NOT EXISTS tax_obligations (
  id text PRIMARY KEY,
  jurisdiction_key text NOT NULL,
  jurisdiction_id text,
  obligation_type text NOT NULL,
  period_key text NOT NULL,
  period_end timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  status text NOT NULL,
  amount_due_cents integer NOT NULL,
  payload_json jsonb NOT NULL,
  linked_filing_run_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_status_due ON tax_obligations (status, due_date);
CREATE INDEX IF NOT EXISTS idx_tax_obligations_jurisdiction ON tax_obligations (jurisdiction_key, period_key);

CREATE TABLE IF NOT EXISTS remittance_runs (
  id text PRIMARY KEY,
  obligation_id text NOT NULL REFERENCES tax_obligations(id) ON DELETE CASCADE,
  jurisdiction_key text NOT NULL,
  status text NOT NULL,
  amount_cents integer NOT NULL,
  rail text NOT NULL,
  submission_ref text,
  payment_evidence_uri text,
  output_uri text,
  failure_reason text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_remittance_runs_obligation ON remittance_runs (obligation_id);
CREATE INDEX IF NOT EXISTS idx_remittance_runs_status ON remittance_runs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS remittance_exceptions (
  id text PRIMARY KEY,
  remittance_run_id text NOT NULL REFERENCES remittance_runs(id) ON DELETE CASCADE,
  reason text NOT NULL,
  next_action text NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_remittance_exceptions_unresolved ON remittance_exceptions (resolved_at) WHERE resolved_at IS NULL;
