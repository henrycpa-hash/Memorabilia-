-- CrownX Jewel — semantic-metrics-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS metric_definitions (
  id                TEXT PRIMARY KEY,
  metric_key        TEXT NOT NULL,
  label             TEXT NOT NULL,
  category          TEXT NOT NULL,
  source            TEXT NOT NULL,
  unit              TEXT NOT NULL,
  description       TEXT NOT NULL,
  dimensions_json   JSONB NOT NULL,
  tenant_id         TEXT,
  governance        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_definitions_key ON metric_definitions(metric_key);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_category ON metric_definitions(category);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_tenant ON metric_definitions(tenant_id);
