-- Wave 10 enterprise planning + forecasting
CREATE TABLE IF NOT EXISTS strategic_accounts (
  id text PRIMARY KEY,
  account_name text NOT NULL,
  owner_user_id text,
  crm_account_ref text,
  opportunity_id text,
  sovereignty_tier text NOT NULL,
  status text NOT NULL,
  metadata_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_strategic_accounts_status ON strategic_accounts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS account_plans (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES strategic_accounts(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  milestones_json jsonb NOT NULL,
  blockers_json jsonb NOT NULL,
  dependencies_json jsonb NOT NULL,
  readiness_score integer NOT NULL,
  author_user_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_plans_account_period ON account_plans (account_id, period_key);

CREATE TABLE IF NOT EXISTS scenario_models (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES strategic_accounts(id) ON DELETE CASCADE,
  scenario_name text NOT NULL,
  assumptions_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scenario_models_account ON scenario_models (account_id);

CREATE TABLE IF NOT EXISTS forecast_runs (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES strategic_accounts(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  scenario_model_id text,
  scenarios_json jsonb NOT NULL,
  primary_confidence text NOT NULL,
  crm_baseline_cents integer,
  variance_vs_crm_cents integer,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forecast_runs_account ON forecast_runs (account_id, created_at DESC);
