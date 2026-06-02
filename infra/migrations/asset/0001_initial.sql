-- CrownX Jewel — asset-registry-service initial migration (Wave 2)
CREATE TABLE IF NOT EXISTS assets (
  id                  TEXT PRIMARY KEY,
  originator_id       TEXT NOT NULL,
  current_owner_id    TEXT,
  asset_type          TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  slug                TEXT NOT NULL UNIQUE,
  authenticity_status TEXT NOT NULL DEFAULT 'draft',
  edition_type        TEXT,
  edition_number      INT,
  total_edition_size  INT,
  visibility          TEXT NOT NULL DEFAULT 'private',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_upload_intents (
  id            TEXT PRIMARY KEY,
  asset_id      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  object_type   TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  upload_key    TEXT NOT NULL,
  presigned_url TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending_upload',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_objects (
  id           TEXT PRIMARY KEY,
  asset_id     TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  object_type  TEXT NOT NULL,
  storage_uri  TEXT NOT NULL,
  file_hash    TEXT NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id           TEXT PRIMARY KEY,
  asset_id     TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  seller_id    TEXT NOT NULL,
  listing_type TEXT NOT NULL,
  price        NUMERIC(14, 2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ownership_records (
  id                  TEXT PRIMARY KEY,
  asset_id            TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  owner_id            TEXT NOT NULL,
  acquired_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  acquisition_method  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_visibility ON assets(visibility);
CREATE INDEX IF NOT EXISTS idx_assets_slug ON assets(slug);
CREATE INDEX IF NOT EXISTS idx_evidence_objects_asset_id ON evidence_objects(asset_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
