-- CrownX Jewel — coa-provenance-service initial migration (Wave 2)
CREATE TABLE IF NOT EXISTS coa_records (
  id            TEXT PRIMARY KEY,
  asset_id      TEXT NOT NULL,
  coa_number    TEXT NOT NULL UNIQUE,
  manifest_hash TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'issued',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provenance_snapshots (
  id          TEXT PRIMARY KEY,
  asset_id    TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coa_records_asset_id ON coa_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_provenance_snapshots_asset_id ON provenance_snapshots(asset_id);
