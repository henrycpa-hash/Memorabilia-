-- CrownX Jewel — connector-runtime-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS connectors (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  provider_key      TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  tenant_id         TEXT,
  credential_ref    TEXT,
  status            TEXT NOT NULL,
  retry_policy_json JSONB NOT NULL,
  config_json       JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connector_call_logs (
  id              TEXT PRIMARY KEY,
  connector_id    TEXT NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  operation       TEXT NOT NULL,
  attempt         INTEGER NOT NULL,
  outcome         TEXT NOT NULL,
  duration_ms     INTEGER NOT NULL,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connectors_kind ON connectors(kind);
CREATE INDEX IF NOT EXISTS idx_connectors_status ON connectors(status);
CREATE INDEX IF NOT EXISTS idx_connector_calls_connector ON connector_call_logs(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_calls_outcome ON connector_call_logs(outcome);
