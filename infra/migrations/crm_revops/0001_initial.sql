-- Wave 11 CRM/RevOps sync
CREATE TABLE IF NOT EXISTS crm_sync_accounts (
  id text PRIMARY KEY,
  external_account_id text NOT NULL,
  internal_account_id text,
  provider text NOT NULL,
  status text NOT NULL,
  payload_json jsonb NOT NULL,
  last_synced_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_external ON crm_sync_accounts (external_account_id, provider);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON crm_sync_accounts (status, last_synced_at);

CREATE TABLE IF NOT EXISTS crm_sync_opportunities (
  id text PRIMARY KEY,
  external_opportunity_id text NOT NULL,
  external_account_id text NOT NULL,
  internal_opportunity_id text,
  provider text NOT NULL,
  status text NOT NULL,
  external_stage text NOT NULL,
  platform_stage text NOT NULL,
  probability_bps integer NOT NULL,
  estimated_close_date timestamptz,
  amount_cents integer NOT NULL,
  owner_user_id text,
  last_synced_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crm_opps_external ON crm_sync_opportunities (external_opportunity_id, provider);
CREATE INDEX IF NOT EXISTS idx_crm_opps_account ON crm_sync_opportunities (external_account_id, platform_stage);

CREATE TABLE IF NOT EXISTS forecast_reconciliations (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  period_key text NOT NULL,
  platform_forecast_json jsonb NOT NULL,
  crm_forecast_json jsonb NOT NULL,
  variance_cents integer NOT NULL,
  variance_pct real NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_forecast_reconciliations_account ON forecast_reconciliations (account_id, period_key, created_at DESC);
