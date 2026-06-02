-- Wave 11 driver forecast model
CREATE TABLE IF NOT EXISTS forecast_drivers (
  id text PRIMARY KEY,
  driver_key text NOT NULL UNIQUE,
  category text NOT NULL,
  display_name text NOT NULL,
  default_value real NOT NULL,
  unit text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS forecast_model_runs (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  period_key text NOT NULL,
  scenario_type text NOT NULL,
  assumptions_json jsonb NOT NULL,
  driver_inputs_json jsonb NOT NULL,
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forecast_model_runs_account ON forecast_model_runs (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forecast_sensitivities (
  id text PRIMARY KEY,
  run_id text NOT NULL REFERENCES forecast_model_runs(id) ON DELETE CASCADE,
  driver_key text NOT NULL,
  delta_type text NOT NULL,
  delta_value real NOT NULL,
  scenario_type text NOT NULL,
  result_json jsonb NOT NULL,
  variance_cents integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forecast_sensitivities_run ON forecast_sensitivities (run_id, driver_key);
