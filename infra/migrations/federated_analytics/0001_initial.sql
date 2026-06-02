-- CrownX Jewel — federated-analytics-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS peer_groups (
  id              TEXT PRIMARY KEY,
  peer_group_key  TEXT NOT NULL,
  scope_type      TEXT NOT NULL,
  description     TEXT NOT NULL,
  rules_json      JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmark_runs (
  id                          TEXT PRIMARY KEY,
  peer_group_id               TEXT NOT NULL REFERENCES peer_groups(id) ON DELETE CASCADE,
  requested_by_tenant_id      TEXT,
  metric_keys_json            JSONB NOT NULL,
  results_json                JSONB NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peer_groups_key ON peer_groups(peer_group_key);
CREATE INDEX IF NOT EXISTS idx_peer_groups_scope ON peer_groups(scope_type);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_group ON benchmark_runs(peer_group_id);
