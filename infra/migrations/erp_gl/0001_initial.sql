-- CrownX Jewel — erp-gl-connector-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS erp_profiles (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT,
  provider      TEXT NOT NULL,
  name          TEXT NOT NULL,
  mapping_json  JSONB NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_exports (
  id                          TEXT PRIMARY KEY,
  profile_id                  TEXT NOT NULL REFERENCES erp_profiles(id) ON DELETE CASCADE,
  export_type                 TEXT NOT NULL,
  batch_key                   TEXT NOT NULL,
  source_export_package_id    TEXT,
  status                      TEXT NOT NULL,
  output_uri                  TEXT,
  row_count                   INTEGER NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at                TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS erp_ack_events (
  id                  TEXT PRIMARY KEY,
  export_id           TEXT NOT NULL REFERENCES erp_exports(id) ON DELETE CASCADE,
  status              TEXT NOT NULL,
  accepted_rows       INTEGER NOT NULL,
  rejected_rows       INTEGER NOT NULL,
  exception_lines_json JSONB NOT NULL,
  payload_json        JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_exports_profile ON erp_exports(profile_id);
CREATE INDEX IF NOT EXISTS idx_erp_exports_status ON erp_exports(status);
CREATE INDEX IF NOT EXISTS idx_erp_acks_export ON erp_ack_events(export_id);
